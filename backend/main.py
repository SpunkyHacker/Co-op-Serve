import os
import random
import time
import smtplib
import math
import heapq
import requests
from email.message import EmailMessage
import jwt
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dnifaxnwicfbzenafysn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaWZheG53aWNmYnplbmFmeXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzc0NTUsImV4cCI6MjEwMzg1MzQ1NX0.3Ankv5FmQ4q_9pdxW_myrvrfRG-68rKpKhj9zAHZU3M")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

SENDER_EMAIL = "nithusaran7777@gmail.com"
APP_PASSWORD = "yhsz uxyh txni mlnk" 
JWT_SECRET = "nithis_is_gay"
JWT_ALGORITHM = "HS256"

otp_store = {}

def send_email(receiver_email: str, otp_code: str):
    msg = EmailMessage()
    msg.set_content(f"Hello!\n\nYour login code for the platform is: {otp_code}\n\nThis code expires in 5 minutes.")
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
    payload = {
        "sub": contact,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat, dlon = lat2_rad - lat1_rad, lon2_rad - lon1_rad
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def get_road_distances_batch(customer_lat: float, customer_lng: float, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Fetches real-time road distances using the free public OSRM API.
    OSRM requires coordinates in longitude, latitude order.
    """
    if not candidates:
        return candidates

    # Build coordinate string: customer first, then all workers
    coords_list = [f"{customer_lng},{customer_lat}"]
    for c in candidates:
        coords_list.append(f"{c['location_lng']},{c['location_lat']}")
        
    coords_str = ";".join(coords_list)
    
    # Request distance table from customer (source=0) to all workers
    url = f"http://router.project-osrm.org/table/v1/driving/{coords_str}?sources=0"

    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if data.get("code") == "Ok":
            distances = data["distances"][0]
            for i, c in enumerate(candidates):
                # distances[0] is customer-to-customer. Workers start at index 1.
                dist_meters = distances[i + 1]
                if dist_meters is not None:
                    c["distance_km"] = round(dist_meters / 1000.0, 2)
                else:
                    c["distance_km"] = c["haversine_dist"]
        else:
            for c in candidates:
                c["distance_km"] = c["haversine_dist"]
    except Exception as e:
        print(f"OSRM API error, falling back to straight-line: {e}")
        for c in candidates:
            c["distance_km"] = c["haversine_dist"]

    return candidates

class ConsumerCentricRankingEngine:
    def __init__(self, platform_avg_rating: float = 4.2, bayes_min_jobs: int = 15):
        self.C = platform_avg_rating
        self.m = bayes_min_jobs
        
        self.weight_profiles = {
            # "recommended": {"d": 0.20, "p": 0.20, "q": 0.35, "t": 0.25},
            # "premium":     {"d": 0.10, "p": 0.05, "q": 0.55, "t": 0.30},
            # "budget":      {"d": 0.15, "p": 0.60, "q": 0.15, "t": 0.10},
            # "nearest":     {"d": 0.60, "p": 0.15, "q": 0.15, "t": 0.10}
            # Recommended remains a balanced mix for the default general view
            "recommended": {"d": 0.25, "p": 0.25, "q": 0.30, "t": 0.20},
            
            # Premium strictly ranks by best ratings and verified trust (Ignores price and distance)
            "premium":     {"d": 0.00, "p": 0.00, "q": 0.70, "t": 0.30},
            
            # Budget strictly ranks from cheapest to most expensive (Ignores distance and quality)
            "budget":      {"d": 0.00, "p": 1.00, "q": 0.00, "t": 0.00},
            
            # Nearest strictly ranks from closest to furthest (Ignores price and quality)
            "nearest":     {"d": 1.00, "p": 0.00, "q": 0.00, "t": 0.00}
        }

    def rank_workers(self, candidates: List[Dict[str, Any]], max_radius_km: float, sort_preference: str, top_k: int = 10):
        if not candidates:
            return []

        weights = self.weight_profiles.get(sort_preference, self.weight_profiles["recommended"])
        prices = [c["hourly_rate"] for c in candidates]
        p_min, p_max = min(prices), max(prices)
        scored_candidates = []

        for w in candidates:
            s_dist = max(0.0, 1.0 - (w["distance_km"] / max_radius_km)) if max_radius_km > 0 else 0.0
            rate = float(w["hourly_rate"])
            s_price = 1.0 if p_max == p_min else (p_max - rate) / (p_max - p_min)

            jobs = w.get("total_jobs_completed", 0)
            rating = float(w.get("avg_rating", self.C))
            bayes_rating = (jobs * rating + self.m * self.C) / (jobs + self.m)
            s_qual = (bayes_rating - 1.0) / 4.0 

            s_trust = (0.7 * min(1.0, jobs / 100.0)) + (0.3 * (1.0 if w.get("is_verified") else 0.0))

            final_score = (weights["d"] * s_dist) + (weights["p"] * s_price) + (weights["q"] * s_qual) + (weights["t"] * s_trust)

            scored_candidates.append({
                **w,
                "final_score": round(final_score, 4)
            })

        return heapq.nlargest(top_k, scored_candidates, key=lambda x: x["final_score"])

ranking_engine = ConsumerCentricRankingEngine()

class OTPRequest(BaseModel):
    contact: str
    role: str

class OTPVerify(BaseModel):
    contact: str
    otp: str
    role: str

class WorkerLocationUpdate(BaseModel):
    worker_id: str
    lat: float
    lng: float

@app.get("/")
def read_root():
    return {"message": "The FastAPI Gig Marketplace is running!"}

@app.get("/api/workers")
def get_workers():
    response = supabase.table("workers").select("*").execute()
    return response.data

@app.post("/api/auth/request-otp")
async def request_otp(data: OTPRequest):
    otp = str(random.randint(100000, 999999))
    expires_at = time.time() + 300 
    otp_store[data.contact] = {"otp": otp, "expires": expires_at}
    
    if "@" in data.contact:
        email_sent = send_email(data.contact, otp)
        if not email_sent:
            return {"success": False, "message": "Failed to send email."}
    else:
        return {"success": False, "message": "Phone SMS not configured."}
    return {"success": True, "message": "OTP sent successfully"}

@app.post("/api/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    stored_data = otp_store.get(data.contact)
    if not stored_data:
        return {"success": False, "message": "No OTP requested"}
    if time.time() > stored_data["expires"]:
        del otp_store[data.contact]
        return {"success": False, "message": "OTP expired"}
    if stored_data["otp"] == data.otp:
        del otp_store[data.contact]
        token = create_jwt(data.contact, data.role)
        return {"success": True, "token": token, "message": "Logged in successfully"}
    else:
        return {"success": False, "message": "Invalid OTP"}

@app.post("/api/workers/update-location")
async def update_worker_location(data: WorkerLocationUpdate):
    supabase.table("workers") \
        .update({"location_lat": data.lat, "location_lng": data.lng}) \
        .eq("id", data.worker_id) \
        .execute()
    return {"status": "success", "message": "Worker coordinates updated"}

@app.get("/api/workers/search")
def search_workers(
    customer_lat: float,
    customer_lng: float,
    skill_category: str,
    sort_preference: str = Query("recommended", enum=["recommended", "premium", "budget", "nearest"]),
    req_gender: Optional[str] = None,
    req_language: Optional[str] = None,
    must_be_verified: bool = False,
    max_price: Optional[float] = None,
    search_radius_km: float = 10.0
):
    response = supabase.table("workers") \
        .select("*, users(name)") \
        .eq("skill_category", skill_category) \
        .eq("is_available", True) \
        .execute()
    
    candidates = []
    
    for w in response.data:
        worker_lat = w.get("location_lat")
        worker_lng = w.get("location_lng")
        
        if worker_lat is None or worker_lng is None:
            continue
            
        # Initial rough pre-filter using Haversine distance
        dist = haversine_distance(customer_lat, customer_lng, worker_lat, worker_lng)
        worker_service_radius = w.get("service_radius_km") or 999.0
        
        if dist > search_radius_km or dist > worker_service_radius:
            continue
            
        if req_gender and w.get("gender") != req_gender:
            continue
        if must_be_verified and not w.get("is_verified"):
            continue
        if max_price and w.get("hourly_rate", 0) > max_price:
            continue
        if req_language:
            langs = w.get("languages_spoken") or ""
            if req_language.lower() not in langs.lower():
                continue

        candidates.append({
            "worker_id": w["id"],
            "full_name": w["users"]["name"] if w.get("users") else "Unknown",
            "hourly_rate": w.get("hourly_rate", 0),
            "avg_rating": w.get("avg_rating", 0),
            "total_jobs_completed": w.get("total_jobs_completed", 0),
            "is_verified": w.get("is_verified", False),
            "location_lat": worker_lat,
            "location_lng": worker_lng,
            "haversine_dist": round(dist, 2)
        })
        
    # Process the pre-filtered candidates through the free OSRM distance API
    refined_candidates = get_road_distances_batch(customer_lat, customer_lng, candidates)

    ranked_results = ranking_engine.rank_workers(
        candidates=refined_candidates, 
        max_radius_km=search_radius_km, 
        sort_preference=sort_preference, 
        top_k=10
    )
    
    return {"status": "success", "results": ranked_results}