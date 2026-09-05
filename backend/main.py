import os
import math
import heapq
import requests
import uuid
import time
import random
import smtplib
from email.message import EmailMessage
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import create_client, Client
from pydantic import BaseModel
from dotenv import load_dotenv

# 1. Load environment variables FIRST
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Allow the specific ports your React app uses
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Without this, an unhandled crash anywhere below returns Starlette's default
# error response, which bypasses CORSMiddleware and has no CORS headers on it.
# The browser then can't read the response at all and reports it to JS as a
# generic "Failed to fetch" - hiding the real error (and the real status code)
# completely. This handler keeps crashes inside the normal CORS-wrapped response
# path, so the frontend gets a readable JSON error instead of a lie.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"status": "error", "message": str(exc)})

# 2. Safely fetch credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials. Check your .env file!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

SENDER_EMAIL = os.environ.get("SENDER_EMAIL")
APP_PASSWORD = os.environ.get("APP_PASSWORD")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev_fallback_secret")
JWT_ALGORITHM = "HS256"

otp_store = {}

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def parse_ts(ts: str) -> datetime:
    # Supabase returns timestamptz values as timezone-aware ISO strings.
    # datetime.utcnow() is naive, so comparing it directly against these raises
    # "can't compare offset-naive and offset-aware datetimes" - always go through
    # this helper (and utcnow() above) instead of the bare datetime calls.
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

# Terminal statuses that mean "this particular booking row is no longer in play"
INACTIVE_STATUSES = ("pending", "rejected", "cancelled", "expired")

# --- UTILITY FUNCTIONS ---

def send_email(receiver_email: str, otp_code: str):
    msg = EmailMessage()
    msg.set_content(f"Hello!\n\nYour login code is: {otp_code}\n\nThis code expires in 5 minutes.")
    msg['Subject'] = 'Your Login Code'
    msg['From'] = SENDER_EMAIL
    msg['To'] = receiver_email
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def create_jwt(contact: str, role: str):
    expiration = datetime.utcnow() + timedelta(days=7)
    payload = {"sub": contact, "role": role, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat, dlon = lat2_rad - lat1_rad, lon2_rad - lon1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def calculate_eta_mins(distance_km: float) -> int:
    avg_speed_kmh = 30.0
    time_hours = distance_km / avg_speed_kmh
    return int((time_hours * 60) + 2)

def get_road_distances_batch(customer_lat: float, customer_lng: float, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not candidates: return candidates
    coords_list = [f"{customer_lng},{customer_lat}"]
    for c in candidates:
        coords_list.append(f"{c['location_lng']},{c['location_lat']}")
    coords_str = ";".join(coords_list)
    url = f"http://router.project-osrm.org/table/v1/driving/{coords_str}?sources=0&annotations=distance"
    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        if data.get("code") == "Ok":
            distances = data["distances"][0]
            for i, c in enumerate(candidates):
                dist_meters = distances[i + 1]
                c["distance_km"] = round(dist_meters / 1000.0, 2) if dist_meters else c["haversine_dist"]
        else:
            for c in candidates: c["distance_km"] = c["haversine_dist"]
    except Exception:
        for c in candidates: c["distance_km"] = c["haversine_dist"]
    return candidates

# --- RANKING ENGINE ---

class ConsumerCentricRankingEngine:
    def __init__(self, platform_avg_rating: float = 4.2, bayes_min_jobs: int = 15):
        self.C = platform_avg_rating
        self.m = bayes_min_jobs
        self.weight_profiles = {"recommended": {"d": 0.30, "p": 0.20, "q": 0.30, "t": 0.20}}
        self.primary_metric_map = {
            "nearest": ("distance_km", "asc"),
            "budget": ("hourly_rate", "asc"),
            "premium": ("_bayes_quality", "desc"),
        }

    def _score_candidate(self, w: Dict[str, Any], p_min: float, p_max: float, max_radius_km: float) -> Dict[str, float]:
        s_dist = max(0.0, 1.0 - (w["distance_km"] / max_radius_km)) if max_radius_km > 0 else 0.0
        rate = float(w["hourly_rate"])
        s_price = 1.0 if p_max == p_min else (p_max - rate) / (p_max - p_min)
        jobs = w.get("total_jobs_completed", 0)
        rating = float(w.get("avg_rating", self.C))
        bayes_rating = (jobs * rating + self.m * self.C) / (jobs + self.m)
        s_qual = (bayes_rating - 1.0) / 4.0
        s_trust = (0.7 * min(1.0, jobs / 100.0)) + (0.3 * (1.0 if w.get("is_verified") else 0.0))
        return {"s_dist": s_dist, "s_price": s_price, "s_qual": s_qual, "s_trust": s_trust, "_bayes_quality": bayes_rating}

    def rank_workers(self, candidates: List[Dict[str, Any]], max_radius_km: float, sort_preference: str, top_k: int = 10):
        if not candidates: return []
        prices = [c["hourly_rate"] for c in candidates]
        p_min, p_max = min(prices), max(prices)
        weights = self.weight_profiles["recommended"]

        scored_candidates = []
        for w in candidates:
            scores = self._score_candidate(w, p_min, p_max, max_radius_km)
            blended_score = (weights["d"] * scores["s_dist"] + weights["p"] * scores["s_price"] + weights["q"] * scores["s_qual"] + weights["t"] * scores["s_trust"])
            w["eta_mins"] = calculate_eta_mins(w["distance_km"])
            scored_candidates.append({**w, **scores, "final_score": round(blended_score, 4)})

        if sort_preference == "recommended" or sort_preference not in self.primary_metric_map:
            return heapq.nlargest(top_k, scored_candidates, key=lambda x: x["final_score"])

        field, direction = self.primary_metric_map[sort_preference]
        reverse_primary = (direction == "desc")
        def sort_key(c):
            primary = c[field]
            primary_rank = -primary if not reverse_primary else primary
            return (primary_rank, c["final_score"])
        return sorted(scored_candidates, key=sort_key, reverse=True)[:top_k]

ranking_engine = ConsumerCentricRankingEngine()

# --- PYDANTIC MODELS ---

class OTPRequest(BaseModel): contact: str; role: str
class OTPVerify(BaseModel): contact: str; otp: str; role: str
class WorkerLocationUpdate(BaseModel): worker_id: str; lat: float; lng: float
class BookingRequestModel(BaseModel): customer_id: str; customer_lat: float; customer_lng: float; worker_ids: List[str]; service_id: str; price: float
class WorkerResponseModel(BaseModel): booking_id: str; worker_id: str; group_id: str; action: str
class BookingStatusUpdate(BaseModel): booking_id: str; status: str
class JobCompletionModel(BaseModel): booking_id: str; worker_id: str; payment_amount: float; payment_method: str; rating_given: int; review_text: Optional[str] = ""

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/request-otp")
async def request_otp(data: OTPRequest):
    otp = str(random.randint(100000, 999999))
    otp_store[data.contact] = {"otp": otp, "expires": time.time() + 300}
    if "@" in data.contact:
        if not send_email(data.contact, otp): return {"success": False, "message": "Failed to send email."}
    else: return {"success": False, "message": "Phone SMS not configured."}
    return {"success": True, "message": "OTP sent successfully"}

@app.post("/api/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    stored = otp_store.get(data.contact)
    if not stored: return {"success": False, "message": "No OTP requested"}
    if time.time() > stored["expires"]:
        del otp_store[data.contact]
        return {"success": False, "message": "OTP expired"}
    if stored["otp"] == data.otp:
        del otp_store[data.contact]
        return {"success": True, "token": create_jwt(data.contact, data.role), "message": "Logged in successfully"}
    return {"success": False, "message": "Invalid OTP"}

# --- ALGORITHM / SEARCH ENDPOINT ---

@app.get("/api/workers/search")
def search_workers(
    customer_lat: float, customer_lng: float, skill_category: str,
    sort_preference: str = Query("recommended", enum=["recommended", "premium", "budget", "nearest"]),
    req_gender: Optional[str] = None, req_language: Optional[str] = None,
    must_be_verified: bool = False, max_price: Optional[float] = None, search_radius_km: float = 15.0,
):
    response = supabase.table("workers").select("*, users(name)").eq("skill_category", skill_category).eq("is_available", True).execute()
    candidates = []
    for w in response.data:
        worker_lat, worker_lng = w.get("location_lat"), w.get("location_lng")
        if worker_lat is None or worker_lng is None: continue
        dist = haversine_distance(customer_lat, customer_lng, worker_lat, worker_lng)
        if dist > search_radius_km * 1.5: continue
        if must_be_verified and not w.get("is_verified"): continue
        if max_price and w.get("hourly_rate", 0) > max_price: continue
        if req_gender and w.get("gender") != req_gender: continue
        if req_language and req_language.lower() not in (w.get("languages_spoken") or "").lower(): continue

        candidates.append({
            "worker_id": w["id"], "full_name": w["users"]["name"] if w.get("users") else "Unknown",
            "hourly_rate": w.get("hourly_rate", 0), "avg_rating": w.get("avg_rating", 0),
            "total_jobs_completed": w.get("total_jobs_completed", 0), "is_verified": w.get("is_verified", False),
            "location_lat": worker_lat, "location_lng": worker_lng, "haversine_dist": round(dist, 2),
        })

    refined_candidates = [c for c in get_road_distances_batch(customer_lat, customer_lng, candidates) if c["distance_km"] <= search_radius_km]
    ranked_results = ranking_engine.rank_workers(candidates=refined_candidates, max_radius_km=search_radius_km, sort_preference=sort_preference, top_k=10)
    return {"status": "success", "results": ranked_results, "result_count": len(ranked_results)}

# --- BOOKING FLOW ENDPOINTS ---

@app.post("/api/bookings/request")
async def create_booking_request(data: BookingRequestModel):
    group_id = str(uuid.uuid4())
    bookings_to_insert = [{
        "group_id": group_id, "customer_id": data.customer_id, "customer_lat": data.customer_lat,
        "customer_lng": data.customer_lng, "worker_id": w_id, "service_id": data.service_id,
        "status": "pending", "price": data.price, "expires_at": (utcnow() + timedelta(minutes=2)).isoformat()
    } for w_id in data.worker_ids[:3]]
    insert_res = supabase.table("bookings").insert(bookings_to_insert).execute()
    booking_ids = [row["id"] for row in insert_res.data]
    # booking_ids[i] corresponds to worker_ids[i] (same insert order)
    return {"status": "success", "group_id": group_id, "booking_ids": booking_ids}

def _customer_name(req: Dict[str, Any]) -> str:
    # bookings.customer_id -> customers.id -> customers.user_id -> users.name
    # (customers has no "name" column itself, so this has to go through users)
    customer = req.get("customers") or {}
    user = customer.get("users") or {}
    return user.get("name") or "Customer"

@app.get("/api/workers/{worker_id}/requests")
def get_worker_requests(worker_id: str, worker_lat: float, worker_lng: float):
    response = supabase.table("bookings").select("*, customers(user_id, users(name))").eq("worker_id", worker_id).eq("status", "pending").execute()
    requests_data = []
    for req in response.data:
        if parse_ts(req["expires_at"]) < utcnow():
            supabase.table("bookings").update({"status": "expired"}).eq("id", req["id"]).execute()
            continue
        dist_km = haversine_distance(worker_lat, worker_lng, req["customer_lat"], req["customer_lng"])
        requests_data.append({
            "booking_id": req["id"], "group_id": req["group_id"], "customer_name": _customer_name(req),
            "price": req["price"], "distance_km": round(dist_km, 2), "eta_mins": calculate_eta_mins(dist_km), "expires_at": req["expires_at"],
        })
    return {"status": "success", "requests": requests_data}

@app.get("/api/workers/{worker_id}/incoming")
def get_worker_incoming(worker_id: str):
    """Same as /requests but keyed off the worker's own stored location, and shaped
    for callers that expect a single job object (or {}) rather than a list."""
    worker_res = supabase.table("workers").select("location_lat, location_lng").eq("id", worker_id).execute()
    if not worker_res.data:
        raise HTTPException(status_code=404, detail="Worker not found")
    worker_lat = worker_res.data[0].get("location_lat")
    worker_lng = worker_res.data[0].get("location_lng")

    response = supabase.table("bookings").select("*, customers(user_id, users(name))").eq("worker_id", worker_id).eq("status", "pending").execute()
    for req in response.data:
        if parse_ts(req["expires_at"]) < utcnow():
            supabase.table("bookings").update({"status": "expired"}).eq("id", req["id"]).execute()
            continue
        dist_km = (
            haversine_distance(worker_lat, worker_lng, req["customer_lat"], req["customer_lng"])
            if worker_lat is not None and worker_lng is not None else 0.0
        )
        return {
            "booking_id": req["id"], "group_id": req["group_id"], "customer_name": _customer_name(req),
            "price": req["price"], "distance_km": round(dist_km, 2), "eta_mins": calculate_eta_mins(dist_km), "expires_at": req["expires_at"],
        }
    return {}

@app.post("/api/bookings/respond")
async def worker_respond(data: WorkerResponseModel):
    if data.action == "reject":
        supabase.table("bookings").update({"status": "rejected"}).eq("id", data.booking_id).execute()
        return {"status": "success", "message": "Job rejected."}
    elif data.action == "accept":
        # Atomic: only succeeds if this row is still "pending" at the moment of the write.
        # If another worker's accept already flipped it, this update matches zero rows,
        # which closes the race the old select-then-update pattern left open.
        update_res = (
            supabase.table("bookings")
            .update({"status": "accepted"})
            .eq("id", data.booking_id)
            .eq("status", "pending")
            .execute()
        )
        if not update_res.data:
            return {"status": "failed", "message": "This job is no longer available (expired or already accepted)."}

        supabase.table("bookings").update({"status": "cancelled"}).eq("group_id", data.group_id).eq("status", "pending").neq("id", data.booking_id).execute()
        supabase.table("workers").update({"is_available": False}).eq("id", data.worker_id).execute()
        booking_data = supabase.table("bookings").select("customer_lat, customer_lng").eq("id", data.booking_id).execute()
        lat, lng = booking_data.data[0]["customer_lat"], booking_data.data[0]["customer_lng"]
        return {"status": "success", "navigation_url": f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=driving"}
    return {"status": "failed", "message": "Unknown action."}

@app.get("/api/bookings/{booking_id}/tracking")
def customer_track_booking(booking_id: str):
    res = supabase.table("bookings").select("status, worker_id").eq("id", booking_id).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Booking not found")
    status, worker_id = res.data[0]["status"], res.data[0]["worker_id"]
    worker_res = supabase.table("workers").select("location_lat, location_lng").eq("id", worker_id).execute()
    return {"status": status, "worker_live_lat": worker_res.data[0].get("location_lat"), "worker_live_lng": worker_res.data[0].get("location_lng")}

@app.get("/api/bookings/group/{group_id}/tracking")
def customer_track_group(group_id: str):
    # Fetch all bookings in the group, along with the worker's name
    res = supabase.table("bookings").select("id, status, worker_id, expires_at, workers(users(name))").eq("group_id", group_id).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Booking group not found")
    rows = res.data

    details = []
    for r in rows:
        # Auto-expire if time ran out
        if r["status"] == "pending" and parse_ts(r["expires_at"]) < utcnow():
            supabase.table("bookings").update({"status": "expired"}).eq("id", r["id"]).execute()
            r["status"] = "expired"
        
        # Safely extract worker name
        worker_data = r.get("workers") or {}
        user_data = worker_data.get("users") or {}
        worker_name = user_data.get("name") or "Worker"

        details.append({
            "booking_id": r["id"],
            "worker_name": worker_name,
            "status": r["status"],
            "expires_at": r["expires_at"]
        })

    active = next((r for r in rows if r["status"] not in INACTIVE_STATUSES), None)

    if active is None:
        if all(r["status"] in ("rejected", "cancelled", "expired") for r in rows):
            return {"status": "no_workers_available", "details": details}
        return {"status": "pending", "details": details}

    worker_res = supabase.table("workers").select("location_lat, location_lng").eq("id", active["worker_id"]).execute()
    loc = worker_res.data[0] if worker_res.data else {}
    return {
        "status": active["status"],
        "booking_id": active["id"],
        "worker_live_lat": loc.get("location_lat"),
        "worker_live_lng": loc.get("location_lng"),
        "details": details
    }
@app.put("/api/bookings/status")
def update_booking_status(data: BookingStatusUpdate):
    supabase.table("bookings").update({"status": data.status}).eq("id", data.booking_id).execute()
    return {"status": "success", "new_status": data.status}

@app.post("/api/bookings/finalize")
async def finalize_job_and_pay(data: JobCompletionModel):
    supabase.table("payments").insert({"booking_id": data.booking_id, "amount": data.payment_amount, "method": data.payment_method, "status": "completed"}).execute()
    supabase.table("ratings").insert({"booking_id": data.booking_id, "rating": data.rating_given, "review": data.review_text}).execute()
    worker_res = supabase.table("workers").select("avg_rating, total_jobs_completed").eq("id", data.worker_id).execute()
    stats = worker_res.data[0]
    new_total = (stats.get("total_jobs_completed") or 0) + 1
    new_avg = (((stats.get("avg_rating") or 0.0) * (new_total - 1)) + data.rating_given) / new_total
    supabase.table("workers").update({"total_jobs_completed": new_total, "avg_rating": round(new_avg, 2), "is_available": True}).eq("id", data.worker_id).execute()
    supabase.table("bookings").update({"status": "completed"}).eq("id", data.booking_id).execute()
    return {"status": "success", "message": "Payment recorded, rating saved, worker online."}

@app.post("/api/workers/update-location")
async def update_worker_location(data: WorkerLocationUpdate):
    supabase.table("workers").update({"location_lat": data.lat, "location_lng": data.lng}).eq("id", data.worker_id).execute()
    return {"status": "success"}