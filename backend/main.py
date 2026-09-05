import os
import math
import heapq
import requests
import uuid
import time
import random
import smtplib

from email.message import EmailMessage
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import jwt

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from supabase import create_client, Client
from pydantic import BaseModel
from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT / APP SETUP
# ============================================================

load_dotenv()

app = FastAPI(title="Co-op Serve API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# SUPABASE
# ============================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Missing Supabase credentials. Check your backend .env file!"
    )

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# ============================================================
# OTHER ENVIRONMENT VARIABLES
# ============================================================

SENDER_EMAIL = os.environ.get("SENDER_EMAIL")
APP_PASSWORD = os.environ.get("APP_PASSWORD")

JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "dev_fallback_secret"
)

JWT_ALGORITHM = "HS256"

otp_store = {}


# ============================================================
# EMAIL / AUTH HELPERS
# ============================================================

def send_email(receiver_email: str, otp_code: str):

    if not SENDER_EMAIL or not APP_PASSWORD:
        print("Email credentials are not configured.")
        return False

    msg = EmailMessage()

    msg.set_content(
        f"Hello!\n\n"
        f"Your login code is: {otp_code}\n\n"
        f"This code expires in 5 minutes."
    )

    msg["Subject"] = "Your Co-op Serve Login Code"
    msg["From"] = SENDER_EMAIL
    msg["To"] = receiver_email

    try:

        server = smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465
        )

        server.login(
            SENDER_EMAIL,
            APP_PASSWORD
        )

        server.send_message(msg)
        server.quit()

        return True

    except Exception as e:

        print(f"Failed to send email: {e}")

        return False


def create_jwt(contact: str, role: str):

    expiration = (
        datetime.utcnow()
        + timedelta(days=7)
    )

    payload = {
        "sub": contact,
        "role": role,
        "exp": expiration,
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


# ============================================================
# LOCATION / DISTANCE HELPERS
# ============================================================

def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:

    R = 6371.0

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)

    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(dlon / 2) ** 2
    )

    return R * (
        2
        * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a)
        )
    )


def calculate_eta_mins(
    distance_km: float
) -> int:

    avg_speed_kmh = 30.0

    time_hours = (
        distance_km
        / avg_speed_kmh
    )

    return int(
        (time_hours * 60)
        + 2
    )


# ============================================================
# OSRM ROAD DISTANCE
# ============================================================

def get_road_distances_batch(
    customer_lat: float,
    customer_lng: float,
    candidates: List[Dict[str, Any]]
):

    if not candidates:
        return candidates

    coords_list = [
        f"{customer_lng},{customer_lat}"
    ]

    for candidate in candidates:

        coords_list.append(
            f"{candidate['location_lng']},"
            f"{candidate['location_lat']}"
        )

    coords_str = ";".join(coords_list)

    url = (
        "http://router.project-osrm.org/table/v1/driving/"
        f"{coords_str}"
        "?sources=0&annotations=distance"
    )

    try:

        response = requests.get(
            url,
            timeout=5
        )

        data = response.json()

        if data.get("code") == "Ok":

            distances = data["distances"][0]

            for index, candidate in enumerate(candidates):

                distance_meters = distances[index + 1]

                if distance_meters is not None:

                    candidate["distance_km"] = round(
                        distance_meters / 1000.0,
                        2
                    )

                else:

                    candidate["distance_km"] = (
                        candidate["haversine_dist"]
                    )

        else:

            for candidate in candidates:

                candidate["distance_km"] = (
                    candidate["haversine_dist"]
                )

    except Exception:

        for candidate in candidates:

            candidate["distance_km"] = (
                candidate["haversine_dist"]
            )

    return candidates


# ============================================================
# RANKING ENGINE
# ============================================================

class ConsumerCentricRankingEngine:

    def __init__(
        self,
        platform_avg_rating: float = 4.2,
        bayes_min_jobs: int = 15
    ):

        self.C = platform_avg_rating
        self.m = bayes_min_jobs

        self.weight_profiles = {
            "recommended": {
                "d": 0.30,
                "p": 0.20,
                "q": 0.30,
                "t": 0.20,
            }
        }

        self.primary_metric_map = {

            "nearest": (
                "distance_km",
                "asc"
            ),

            "budget": (
                "hourly_rate",
                "asc"
            ),

            "premium": (
                "_bayes_quality",
                "desc"
            ),
        }


    def _score_candidate(
        self,
        worker: Dict[str, Any],
        p_min: float,
        p_max: float
    ):

        distance = float(
            worker.get(
                "distance_km",
                0
            )
        )

        price = float(
            worker.get(
                "hourly_rate",
                0
            )
        )

        rating = float(
            worker.get(
                "avg_rating",
                0
            )
        )

        jobs = int(
            worker.get(
                "total_jobs_completed",
                0
            )
        )

        verified = bool(
            worker.get(
                "is_verified",
                False
            )
        )

        # Distance score
        if distance <= 0:
            s_distance = 1.0
        else:
            s_distance = max(
                0.0,
                1.0 - (
                    distance
                    / max(p_max, 1.0)
                )
            )

        # Price score
        if p_max <= p_min:
            s_price = 1.0
        else:
            s_price = max(
                0.0,
                min(
                    1.0,
                    (
                        p_max - price
                    )
                    / (
                        p_max - p_min
                    )
                )
            )

        # Bayesian quality
        bayes_quality = (
            (
                jobs
                / (jobs + self.m)
            )
            * rating
            +
            (
                self.m
                / (jobs + self.m)
            )
            * self.C
        )

        worker["_bayes_quality"] = (
            bayes_quality
        )

        s_quality = max(
            0.0,
            min(
                1.0,
                bayes_quality / 5.0
            )
        )

        s_trust = (
            1.0
            if verified
            else 0.5
        )

        return {
            "s_dist": s_distance,
            "s_price": s_price,
            "s_qual": s_quality,
            "s_trust": s_trust,
        }


    def rank_workers(
        self,
        candidates: List[Dict[str, Any]],
        max_radius_km: float,
        sort_preference: str = "recommended",
        top_k: int = 10
    ):

        if not candidates:
            return []

        prices = [
            float(
                worker.get(
                    "hourly_rate",
                    0
                )
            )
            for worker in candidates
        ]

        p_min = min(prices)
        p_max = max(prices)

        if p_max == p_min:
            p_max = p_min + 1

        weights = self.weight_profiles.get(
            sort_preference,
            self.weight_profiles["recommended"]
        )

        scored_candidates = []

        for worker in candidates:

            scores = self._score_candidate(
                worker,
                p_min,
                p_max
            )

            blended_score = (
                weights["d"]
                * scores["s_dist"]

                +

                weights["p"]
                * scores["s_price"]

                +

                weights["q"]
                * scores["s_qual"]

                +

                weights["t"]
                * scores["s_trust"]
            )

            worker["eta_mins"] = (
                calculate_eta_mins(
                    worker["distance_km"]
                )
            )

            scored_candidates.append({
                **worker,
                **scores,
                "final_score": round(
                    blended_score,
                    4
                )
            })

        if (
            sort_preference == "recommended"
            or sort_preference
            not in self.primary_metric_map
        ):

            return heapq.nlargest(
                top_k,
                scored_candidates,
                key=lambda x: x["final_score"]
            )

        field, direction = (
            self.primary_metric_map[
                sort_preference
            ]
        )

        reverse_primary = (
            direction == "desc"
        )

        if field == "_bayes_quality":

            return sorted(
                scored_candidates,
                key=lambda x: (
                    x.get(
                        "_bayes_quality",
                        0
                    ),
                    x["final_score"]
                ),
                reverse=True
            )[:top_k]

        return sorted(
            scored_candidates,
            key=lambda x: (
                x.get(field, 0),
                x["final_score"]
            ),
            reverse=reverse_primary
        )[:top_k]


ranking_engine = (
    ConsumerCentricRankingEngine()
)


# ============================================================
# PYDANTIC MODELS
# ============================================================

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


class WorkerAvailabilityUpdate(BaseModel):

    worker_id: str
    is_available: bool


class WorkerRadiusUpdate(BaseModel):

    worker_id: str
    service_radius_km: float


class WorkerProfileUpdate(BaseModel):
    worker_id: str
    user_id: str

    name: str
    phone: str

    skill_category: str
    hourly_rate: float

    upi_id: Optional[str] = None

    service_radius_km: float


class BookingRequestModel(BaseModel):

    customer_id: str
    customer_lat: float
    customer_lng: float

    worker_ids: List[str]

    service_id: str
    price: float


class WorkerResponseModel(BaseModel):

    booking_id: str
    worker_id: str
    group_id: str
    action: str


class BookingStatusUpdate(BaseModel):

    booking_id: str
    status: str


class JobCompletionModel(BaseModel):

    booking_id: str
    worker_id: str

    payment_amount: float
    payment_method: str

    rating_given: int

    review_text: Optional[str] = ""


# ============================================================
# BASIC TEST ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "message": "Co-op Serve API is running."
    }


# ============================================================
# AUTH
# ============================================================

@app.post("/api/auth/request-otp")
async def request_otp(
    data: OTPRequest
):

    otp = str(
        random.randint(
            100000,
            999999
        )
    )

    otp_store[data.contact] = {
        "otp": otp,
        "expires": (
            time.time()
            + 300
        )
    }

    if "@" in data.contact:

        if not send_email(
            data.contact,
            otp
        ):

            return {
                "success": False,
                "message": (
                    "Failed to send email."
                )
            }

    else:

        return {
            "success": False,
            "message": (
                "Phone SMS not configured."
            )
        }

    return {
        "success": True,
        "message": "OTP sent successfully"
    }


@app.post("/api/auth/verify-otp")
async def verify_otp(
    data: OTPVerify
):

    stored = otp_store.get(
        data.contact
    )

    if not stored:

        return {
            "success": False,
            "message": "No OTP requested"
        }

    if time.time() > stored["expires"]:

        del otp_store[
            data.contact
        ]

        return {
            "success": False,
            "message": "OTP expired"
        }

    if stored["otp"] == data.otp:

        del otp_store[
            data.contact
        ]

        return {
            "success": True,
            "token": create_jwt(
                data.contact,
                data.role
            ),
            "message": (
                "Logged in successfully"
            )
        }

    return {
        "success": False,
        "message": "Invalid OTP"
    }


# ============================================================
# CUSTOMER → SEARCH WORKERS
# ============================================================

@app.get("/api/workers/search")
def search_workers(

    customer_lat: float,
    customer_lng: float,

    skill_category: str,

    sort_preference: str = Query(
        "recommended",
        enum=[
            "recommended",
            "premium",
            "budget",
            "nearest"
        ]
    ),

    req_gender: Optional[str] = None,
    req_language: Optional[str] = None,

    must_be_verified: bool = False,

    max_price: Optional[float] = None,

    search_radius_km: float = 15.0,
):

    response = (
        supabase
        .table("workers")
        .select(
            "*, users(name)"
        )
        .eq(
            "skill_category",
            skill_category
        )
        .eq(
            "is_available",
            True
        )
        .execute()
    )

    candidates = []

    for worker in response.data:

        worker_lat = worker.get(
            "location_lat"
        )

        worker_lng = worker.get(
            "location_lng"
        )

        if (
            worker_lat is None
            or worker_lng is None
        ):
            continue

        distance = haversine_distance(
            customer_lat,
            customer_lng,
            worker_lat,
            worker_lng
        )

        if (
            distance
            > search_radius_km * 1.5
        ):
            continue

        if (
            must_be_verified
            and not worker.get(
                "is_verified"
            )
        ):
            continue

        if (
            max_price
            and worker.get(
                "hourly_rate",
                0
            ) > max_price
        ):
            continue

        if (
            req_gender
            and worker.get(
                "gender"
            ) != req_gender
        ):
            continue

        if (
            req_language
            and req_language.lower()
            not in (
                worker.get(
                    "languages_spoken"
                )
                or ""
            ).lower()
        ):
            continue

        user_data = (
            worker.get("users")
            or {}
        )

        candidates.append({

            "worker_id": worker["id"],

            "full_name": (
                user_data.get("name")
                or "Unknown"
            ),

            "hourly_rate": worker.get(
                "hourly_rate",
                0
            ),

            "avg_rating": worker.get(
                "avg_rating",
                0
            ),

            "total_jobs_completed": worker.get(
                "total_jobs_completed",
                0
            ),

            "is_verified": worker.get(
                "is_verified",
                False
            ),

            "location_lat": worker_lat,

            "location_lng": worker_lng,

            "haversine_dist": round(
                distance,
                2
            ),
        })

    refined_candidates = (
        get_road_distances_batch(
            customer_lat,
            customer_lng,
            candidates
        )
    )

    refined_candidates = [
        candidate
        for candidate
        in refined_candidates

        if candidate.get(
            "distance_km",
            candidate["haversine_dist"]
        )
        <= search_radius_km
    ]

    ranked_results = (
        ranking_engine.rank_workers(
            candidates=refined_candidates,
            max_radius_km=search_radius_km,
            sort_preference=sort_preference,
            top_k=10
        )
    )

    return {
        "status": "success",
        "results": ranked_results,
        "result_count": len(
            ranked_results
        )
    }


# ============================================================
# CUSTOMER → CREATE BOOKING REQUEST
# ============================================================

@app.post("/api/bookings/request")
async def create_booking_request(
    data: BookingRequestModel
):

    group_id = str(
        uuid.uuid4()
    )

    bookings_to_insert = [

        {
            "group_id": group_id,

            "customer_id": data.customer_id,

            "customer_lat": data.customer_lat,

            "customer_lng": data.customer_lng,

            "worker_id": worker_id,

            "service_id": data.service_id,

            "status": "pending",

            "price": data.price,

            "expires_at": (
                datetime.utcnow()
                + timedelta(minutes=2)
            ).isoformat()
        }

        for worker_id
        in data.worker_ids[:3]
    ]

    result = (
        supabase
        .table("bookings")
        .insert(
            bookings_to_insert
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not create booking request."
            )
        )

    return {
        "status": "success",
        "group_id": group_id
    }


# ============================================================
# WORKER → GET NEARBY JOBS
#
# IMPORTANT:
# The worker's service_radius_km is now read
# directly from Supabase.
# ============================================================

# ============================================================
# WORKER → GET NEARBY JOBS
#
# The worker's service_radius_km is read directly from
# Supabase. workers.id is the worker_id.
# ============================================================

@app.get("/api/workers/{worker_id}/requests")
def get_worker_requests(
    worker_id: str,
    worker_lat: Optional[float] = None,
    worker_lng: Optional[float] = None,
    search_radius_km: Optional[float] = None,
):

    # --------------------------------------------------------
    # GET WORKER FROM DATABASE
    # --------------------------------------------------------

    worker_res = (
        supabase
        .table("workers")
        .select(
            """
            id,
            user_id,
            skill_category,
            is_available,
            location_lat,
            location_lng,
            service_radius_km
            """
        )
        .eq("id", worker_id)
        .single()
        .execute()
    )

    if not worker_res.data:
        raise HTTPException(
            status_code=404,
            detail="Worker not found."
        )

    worker = worker_res.data

    # --------------------------------------------------------
    # WORKER MUST BE AVAILABLE
    # --------------------------------------------------------

    worker_is_available = bool(
        worker.get("is_available")
    )

    if not worker_is_available:
        return {
            "status": "success",
            "requests": [],
            "worker_skill": (
                worker.get("skill_category")
                or ""
            ),
            "service_radius_km": float(
                worker.get("service_radius_km")
                or 15
            ),
            "count": 0
        }

    # --------------------------------------------------------
    # WORKER SKILL
    # --------------------------------------------------------

    worker_skill = (
        worker.get("skill_category")
        or ""
    ).strip().lower()

    # --------------------------------------------------------
    # DATABASE SERVICE RADIUS
    #
    # IMPORTANT:
    # service_radius_km from Supabase is authoritative.
    #
    # search_radius_km is ignored intentionally.
    # --------------------------------------------------------

    database_radius = worker.get(
        "service_radius_km"
    )

    if database_radius is None:
        database_radius = 15.0

    try:
        service_radius_km = float(
            database_radius
        )
    except (
        TypeError,
        ValueError
    ):
        service_radius_km = 15.0

    # Keep radius within sensible limits
    service_radius_km = max(
        1.0,
        min(
            service_radius_km,
            100.0
        )
    )

    # --------------------------------------------------------
    # WORKER LOCATION
    #
    # If frontend sends coordinates, use them.
    # Otherwise use the coordinates stored in workers.
    # --------------------------------------------------------

    if worker_lat is None:
        worker_lat = worker.get(
            "location_lat"
        )

    if worker_lng is None:
        worker_lng = worker.get(
            "location_lng"
        )

    if (
        worker_lat is None
        or worker_lng is None
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Worker location is not available."
            )
        )

    # --------------------------------------------------------
    # GET PENDING BOOKINGS
    #
    # Only bookings assigned to THIS worker are checked.
    # --------------------------------------------------------

    response = (
        supabase
        .table("bookings")
        .select(
            """
            id,
            group_id,
            customer_id,
            service_id,
            status,
            price,
            customer_lat,
            customer_lng,
            expires_at,
            customers(users(name))
            """
        )
        .eq(
            "worker_id",
            worker_id
        )
        .eq(
            "status",
            "pending"
        )
        .execute()
    )

    requests_data = []

    # --------------------------------------------------------
    # PROCESS EACH BOOKING
    # --------------------------------------------------------

    for request in response.data:

        # ----------------------------------------------------
        # CHECK EXPIRATION
        # ----------------------------------------------------

        expires_at = request.get(
            "expires_at"
        )

        if expires_at:

            try:

                expiry_dt = datetime.fromisoformat(
                    expires_at.replace(
                        "Z",
                        "+00:00"
                    )
                )

                now = (
                    datetime.now(
                        expiry_dt.tzinfo
                    )
                    if expiry_dt.tzinfo
                    else datetime.utcnow()
                )

                if expiry_dt < now:

                    (
                        supabase
                        .table("bookings")
                        .update({
                            "status": "expired"
                        })
                        .eq(
                            "id",
                            request["id"]
                        )
                        .execute()
                    )

                    continue

            except Exception:
                # Do not crash the entire endpoint
                # because of an invalid expiry timestamp.
                pass

        # ----------------------------------------------------
        # SERVICE / SKILL MATCH
        # ----------------------------------------------------

        service_id = str(
            request.get(
                "service_id"
            )
            or "Service"
        )

        service_name = service_id

        if worker_skill:

            service_lower = (
                service_name
                .strip()
                .lower()
            )

            # Exact match OR service begins with worker skill
            if (
                service_lower != worker_skill
                and not service_lower.startswith(
                    worker_skill
                )
            ):
                continue

        # ----------------------------------------------------
        # CUSTOMER LOCATION
        # ----------------------------------------------------

        customer_lat = request.get(
            "customer_lat"
        )

        customer_lng = request.get(
            "customer_lng"
        )

        if (
            customer_lat is None
            or customer_lng is None
        ):
            continue

        # ----------------------------------------------------
        # CALCULATE DISTANCE
        # ----------------------------------------------------

        distance_km = haversine_distance(
            float(worker_lat),
            float(worker_lng),
            float(customer_lat),
            float(customer_lng)
        )

        # ----------------------------------------------------
        # SERVICE RADIUS FILTER
        # ----------------------------------------------------

        if distance_km > service_radius_km:
            continue

        # ----------------------------------------------------
        # CUSTOMER NAME
        #
        # customers table has no "name" column.
        # The name lives on users, reached via
        # customers.user_id -> users.id.
        # ----------------------------------------------------

        customer = (
            request.get("customers")
            or {}
        )

        customer_user = (
            customer.get("users")
            or {}
        )

        customer_name = (
            customer_user.get("name")
            or "Customer"
        )

        # ----------------------------------------------------
        # ADD MATCHED JOB
        # ----------------------------------------------------

        requests_data.append({

            "booking_id":
                request["id"],

            "group_id":
                request.get("group_id"),

            "customer_id":
                request.get("customer_id"),

            "customer_name":
                customer_name,

            "service_id":
                service_id,

            "job_title":
                service_name,

            "price":
                request.get(
                    "price",
                    0
                ),

            "customer_lat":
                customer_lat,

            "customer_lng":
                customer_lng,

            "distance_km":
                round(
                    distance_km,
                    2
                ),

            "eta_mins":
                calculate_eta_mins(
                    distance_km
                ),

            "expires_at":
                request.get(
                    "expires_at"
                ),

            "status":
                request.get(
                    "status"
                )
        })

    # --------------------------------------------------------
    # CLOSEST JOBS FIRST
    # --------------------------------------------------------

    requests_data.sort(
        key=lambda item:
            item["distance_km"]
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "status":
            "success",

        "requests":
            requests_data,

        "worker_skill":
            worker_skill,

        "service_radius_km":
            service_radius_km,

        "count":
            len(requests_data)
    }
# ============================================================
# WORKER → AVAILABILITY
# ============================================================

@app.put("/api/workers/availability")
async def update_worker_availability(
    data: WorkerAvailabilityUpdate
):
    """
    Update the worker's availability.

    IMPORTANT:
    data.worker_id MUST be workers.id
    NOT users.id.
    """

    if not data.worker_id:
        raise HTTPException(
            status_code=400,
            detail="Worker ID is required."
        )

    result = (
        supabase
        .table("workers")
        .update({
            "is_available": data.is_available
        })
        .eq(
            "id",
            data.worker_id
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=(
                "Worker record not found. "
                "Make sure worker_id is workers.id."
            )
        )

    # Read back from database.
    # This makes Supabase the source of truth.
    verify_result = (
        supabase
        .table("workers")
        .select(
            "id, user_id, is_available"
        )
        .eq(
            "id",
            data.worker_id
        )
        .single()
        .execute()
    )

    if not verify_result.data:
        raise HTTPException(
            status_code=404,
            detail="Worker could not be verified after update."
        )

    return {
        "status": "success",

        "worker_id":
            verify_result.data["id"],

        "user_id":
            verify_result.data["user_id"],

        "is_available":
            verify_result.data["is_available"],
    }
# ============================================================
# WORKER → UPDATE SERVICE RADIUS
# ============================================================
@app.put("/api/workers/radius")
async def update_worker_radius(
    data: WorkerRadiusUpdate
):
    """
    Update workers.service_radius_km.

    worker_id = workers.id
    """

    if not data.worker_id:
        raise HTTPException(
            status_code=400,
            detail="Worker ID is required."
        )

    if (
        data.service_radius_km < 1
        or data.service_radius_km > 100
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Service radius must be "
                "between 1 and 100 km."
            )
        )

    result = (
        supabase
        .table("workers")
        .update({
            "service_radius_km":
                float(data.service_radius_km)
        })
        .eq(
            "id",
            data.worker_id
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=(
                "Worker record not found. "
                "Make sure worker_id is workers.id."
            )
        )

    # Read back the actual database value.
    verify_result = (
        supabase
        .table("workers")
        .select(
            "id, user_id, service_radius_km"
        )
        .eq(
            "id",
            data.worker_id
        )
        .single()
        .execute()
    )

    if not verify_result.data:
        raise HTTPException(
            status_code=404,
            detail="Worker could not be verified after radius update."
        )

    return {
        "status": "success",

        "worker_id":
            verify_result.data["id"],

        "user_id":
            verify_result.data["user_id"],

        "service_radius_km":
            verify_result.data["service_radius_km"],
    }


# ============================================================
# WORKER → UPDATE PROFILE
# ============================================================
@app.put("/api/workers/profile")
async def update_worker_profile(
    data: WorkerProfileUpdate
):
    """
    Update both:

        users
            ↓
        name / phone

    and

        workers
            ↓
        skill / rate / UPI / service radius

    IDs are deliberately separate:

        data.user_id   = users.id
        data.worker_id = workers.id
    """

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not data.user_id:
        raise HTTPException(
            status_code=400,
            detail="User ID is required."
        )

    if not data.worker_id:
        raise HTTPException(
            status_code=400,
            detail="Worker ID is required."
        )

    if not data.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty."
        )

    if not data.phone.strip():
        raise HTTPException(
            status_code=400,
            detail="Phone cannot be empty."
        )

    if data.hourly_rate < 0:
        raise HTTPException(
            status_code=400,
            detail="Hourly rate cannot be negative."
        )

    if (
        data.service_radius_km < 1
        or data.service_radius_km > 100
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Service radius must be "
                "between 1 and 100 km."
            )
        )

    # --------------------------------------------------------
    # VERIFY USER
    # --------------------------------------------------------

    user_check = (
        supabase
        .table("users")
        .select("id")
        .eq(
            "id",
            data.user_id
        )
        .maybe_single()
        .execute()
    )

    if not user_check.data:
        raise HTTPException(
            status_code=404,
            detail=(
                "User record not found. "
                "user_id must be users.id."
            )
        )

    # --------------------------------------------------------
    # VERIFY WORKER BELONGS TO USER
    # --------------------------------------------------------

    worker_check = (
        supabase
        .table("workers")
        .select(
            "id, user_id"
        )
        .eq(
            "id",
            data.worker_id
        )
        .maybe_single()
        .execute()
    )

    if not worker_check.data:
        raise HTTPException(
            status_code=404,
            detail=(
                "Worker record not found. "
                "worker_id must be workers.id."
            )
        )

    if (
        str(worker_check.data["user_id"])
        != str(data.user_id)
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "This worker does not belong "
                "to this user."
            )
        )

    # --------------------------------------------------------
    # UPDATE USERS
    # --------------------------------------------------------

    user_result = (
        supabase
        .table("users")
        .update({
            "name":
                data.name.strip(),

            "phone":
                data.phone.strip(),
        })
        .eq(
            "id",
            data.user_id
        )
        .execute()
    )

    if not user_result.data:
        raise HTTPException(
            status_code=500,
            detail="User profile could not be updated."
        )

    # --------------------------------------------------------
    # UPDATE WORKERS
    # --------------------------------------------------------

    worker_result = (
        supabase
        .table("workers")
        .update({
            "skill_category":
                data.skill_category.strip(),

            "hourly_rate":
                float(data.hourly_rate),

            "upi_id":
                data.upi_id.strip()
                if data.upi_id
                else None,

            "service_radius_km":
                float(data.service_radius_km),
        })
        .eq(
            "id",
            data.worker_id
        )
        .eq(
            "user_id",
            data.user_id
        )
        .execute()
    )

    if not worker_result.data:
        raise HTTPException(
            status_code=500,
            detail="Worker profile could not be updated."
        )

    # --------------------------------------------------------
    # READ EVERYTHING BACK FROM DATABASE
    # --------------------------------------------------------

    final_user = (
        supabase
        .table("users")
        .select(
            "id, name, phone"
        )
        .eq(
            "id",
            data.user_id
        )
        .single()
        .execute()
    )

    final_worker = (
        supabase
        .table("workers")
        .select(
            "id, user_id, "
            "skill_category, hourly_rate, "
            "upi_id, service_radius_km, "
            "is_available"
        )
        .eq(
            "id",
            data.worker_id
        )
        .single()
        .execute()
    )

    if not final_user.data:
        raise HTTPException(
            status_code=500,
            detail="Updated user could not be read back."
        )

    if not final_worker.data:
        raise HTTPException(
            status_code=500,
            detail="Updated worker could not be read back."
        )

    return {
        "status": "success",

        "message":
            "Profile updated successfully.",

        "user": final_user.data,

        "worker": final_worker.data,
    }

# ============================================================
# WORKER → UPDATE GPS LOCATION
# ============================================================

@app.post(
    "/api/workers/update-location"
)
async def update_worker_location(
    data: WorkerLocationUpdate
):

    if (
        data.lat < -90
        or data.lat > 90
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid latitude."
        )

    if (
        data.lng < -180
        or data.lng > 180
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid longitude."
        )

    result = (
        supabase
        .table("workers")
        .update({

            "location_lat":
                data.lat,

            "location_lng":
                data.lng,

        })
        .eq(
            "id",
            data.worker_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail=(
                "Worker location could not "
                "be updated."
            )
        )

    return {

        "status":
            "success",

        "location_lat":
            data.lat,

        "location_lng":
            data.lng
    }


# ============================================================
# WORKER → RESPOND TO JOB
# ============================================================

@app.post(
    "/api/bookings/respond"
)
async def worker_respond(
    data: WorkerResponseModel
):

    # --------------------------------------------------------
    # CHECK IF ANOTHER WORKER ACCEPTED
    # --------------------------------------------------------

    group_check = (
        supabase
        .table("bookings")
        .select("status")
        .eq(
            "group_id",
            data.group_id
        )
        .eq(
            "status",
            "accepted"
        )
        .execute()
    )

    if (
        group_check.data
        and data.action == "accept"
    ):

        return {

            "status":
                "failed",

            "message":
                (
                    "Another worker already "
                    "accepted this job."
                )
        }

    # --------------------------------------------------------
    # REJECT
    # --------------------------------------------------------

    if data.action == "reject":

        result = (
            supabase
            .table("bookings")
            .update({
                "status":
                    "rejected"
            })
            .eq(
                "id",
                data.booking_id
            )
            .execute()
        )

        return {

            "status":
                "success",

            "message":
                "Job rejected."
        }

    # --------------------------------------------------------
    # ACCEPT
    # --------------------------------------------------------

    if data.action == "accept":

        # Mark this booking accepted
        accepted_result = (
            supabase
            .table("bookings")
            .update({
                "status":
                    "accepted"
            })
            .eq(
                "id",
                data.booking_id
            )
            .execute()
        )

        if not accepted_result.data:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Booking could not "
                    "be accepted."
                )
            )

        # Cancel other workers' pending copies
        (
            supabase
            .table("bookings")
            .update({
                "status":
                    "cancelled"
            })
            .eq(
                "group_id",
                data.group_id
            )
            .eq(
                "status",
                "pending"
            )
            .neq(
                "id",
                data.booking_id
            )
            .execute()
        )

        # ----------------------------------------------------
        # IMPORTANT:
        # Worker becomes unavailable immediately.
        # ----------------------------------------------------

        worker_update = (
            supabase
            .table("workers")
            .update({
                "is_available":
                    False
            })
            .eq(
                "id",
                data.worker_id
            )
            .execute()
        )

        if not worker_update.data:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Worker availability "
                    "could not be updated."
                )
            )

        # Get destination
        booking_data = (
            supabase
            .table("bookings")
            .select(
                "customer_lat, customer_lng"
            )
            .eq(
                "id",
                data.booking_id
            )
            .single()
            .execute()
        )

        if not booking_data.data:

            raise HTTPException(
                status_code=404,
                detail="Booking not found."
            )

        lat = booking_data.data[
            "customer_lat"
        ]

        lng = booking_data.data[
            "customer_lng"
        ]

        navigation_url = (
            "https://www.google.com/maps/dir/"
            "?api=1"
            f"&destination={lat},{lng}"
            "&travelmode=driving"
        )

        return {

            "status":
                "success",

            "message":
                "Job accepted.",

            "navigation_url":
                navigation_url,

            "worker_is_available":
                False,

            "booking_id":
                data.booking_id
        }

    raise HTTPException(
        status_code=400,
        detail=(
            "Invalid action. "
            "Use accept or reject."
        )
    )


# ============================================================
# BOOKING TRACKING
# ============================================================

@app.get(
    "/api/bookings/{booking_id}/tracking"
)
def customer_track_booking(
    booking_id: str
):

    result = (
        supabase
        .table("bookings")
        .select(
            "status, worker_id"
        )
        .eq(
            "id",
            booking_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    booking = result.data[0]

    worker_id = booking[
        "worker_id"
    ]

    worker_result = (
        supabase
        .table("workers")
        .select(
            "location_lat, location_lng"
        )
        .eq(
            "id",
            worker_id
        )
        .execute()
    )

    worker_location = (
        worker_result.data[0]
        if worker_result.data
        else {}
    )

    return {

        "status":
            booking["status"],

        "worker_live_lat":
            worker_location.get(
                "location_lat"
            ),

        "worker_live_lng":
            worker_location.get(
                "location_lng"
            )
    }


# ============================================================
# BOOKING STATUS
# ============================================================

@app.put(
    "/api/bookings/status"
)
def update_booking_status(
    data: BookingStatusUpdate
):

    result = (
        supabase
        .table("bookings")
        .update({
            "status":
                data.status
        })
        .eq(
            "id",
            data.booking_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Booking not found."
        )

    return {

        "status":
            "success",

        "new_status":
            data.status
    }


# ============================================================
# FINALIZE JOB / PAYMENT / RATING
# ============================================================

@app.post(
    "/api/bookings/finalize"
)
async def finalize_job_and_pay(
    data: JobCompletionModel
):

    # --------------------------------------------------------
    # PAYMENT
    # --------------------------------------------------------

    payment_result = (
        supabase
        .table("payments")
        .insert({

            "booking_id":
                data.booking_id,

            "amount":
                data.payment_amount,

            "method":
                data.payment_method,

            "status":
                "completed",

        })
        .execute()
    )

    if not payment_result.data:

        raise HTTPException(
            status_code=500,
            detail=(
                "Payment could not "
                "be recorded."
            )
        )

    # --------------------------------------------------------
    # RATING
    # --------------------------------------------------------

    (
        supabase
        .table("ratings")
        .insert({

            "booking_id":
                data.booking_id,

            "rating":
                data.rating_given,

            "review":
                data.review_text,

        })
        .execute()
    )

    # --------------------------------------------------------
    # UPDATE WORKER STATS
    # --------------------------------------------------------

    worker_result = (
        supabase
        .table("workers")
        .select(
            "avg_rating, total_jobs_completed"
        )
        .eq(
            "id",
            data.worker_id
        )
        .single()
        .execute()
    )

    if not worker_result.data:

        raise HTTPException(
            status_code=404,
            detail="Worker not found."
        )

    stats = worker_result.data

    old_total = int(
        stats.get(
            "total_jobs_completed"
        )
        or 0
    )

    old_rating = float(
        stats.get(
            "avg_rating"
        )
        or 0
    )

    new_total = (
        old_total + 1
    )

    new_average = (
        (
            old_rating
            * old_total
        )
        +
        data.rating_given
    ) / new_total

    # --------------------------------------------------------
    # WORKER BECOMES AVAILABLE AGAIN
    # --------------------------------------------------------

    (
        supabase
        .table("workers")
        .update({

            "total_jobs_completed":
                new_total,

            "avg_rating":
                round(
                    new_average,
                    2
                ),

            "is_available":
                True,

        })
        .eq(
            "id",
            data.worker_id
        )
        .execute()
    )

    # --------------------------------------------------------
    # COMPLETE BOOKING
    # --------------------------------------------------------

    (
        supabase
        .table("bookings")
        .update({
            "status":
                "completed"
        })
        .eq(
            "id",
            data.booking_id
        )
        .execute()
    )

    return {

        "status":
            "success",

        "message":
            (
                "Payment recorded, "
                "rating saved, "
                "worker online."
            )
    }


# ============================================================
# RUN DIRECTLY WITH:
#
# fastapi dev main.py
#
# OR:
#
# python -m uvicorn main:app --reload
# ============================================================