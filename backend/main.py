#fastapi dev main.py

import os
import random
import time
import smtplib
from email.message import EmailMessage
import jwt
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Set up your Supabase connection using environment variables
# Replace the fallback strings with your actual Supabase URL and Key if you aren't using env variables yet
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dnifaxnwicfbzenafysn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaWZheG53aWNmYnplbmFmeXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzc0NTUsImV4cCI6MjEwMzg1MzQ1NX0.3Ankv5FmQ4q_9pdxW_myrvrfRG-68rKpKhj9zAHZU3M")

# 2. Initialize the Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

#structure 
class OTPRequest(BaseModel):
    contact: str
    role: str

class OTPVerify(BaseModel):
    contact: str
    otp: str
    role: str

@app.get("/")
def read_root():
    return {"message": "The FastAPI Gig Marketplace is running!"}

@app.get("/api/workers")
def get_workers():
    # 3. Query the Supabase database
    # This selects all columns ("*") from the 'workers' table and executes the query
    response = supabase.table("workers").select("*").execute()
    
    # 4. Return the data payload from the response
    return response.data


#.            gmail configuration
# ==========================================
# CONFIGURATION
# ==========================================
# 1. Email Config (Using Gmail for development)
SENDER_EMAIL = "nithusaran7777@gmail.com"
APP_PASSWORD = "yhsz uxyh txni mlnk" # NOT your regular gmail password

# 2. JWT Config (Keep this secret in production!)
JWT_SECRET = "nithis_is_gay"
JWT_ALGORITHM = "HS256"

# 3. Temporary OTP Storage (In-memory dict)
# Format: {"worker@email.com": {"otp": "123456", "expires": 1690000000}}
otp_store = {}

# ==========================================
# HELPER FUNCTIONS
# ==========================================
def send_email(receiver_email: str, otp_code: str):
    msg = EmailMessage()
    msg.set_content(f"Hello!\n\nYour login code for the platform is: {otp_code}\n\nThis code expires in 5 minutes.")
    msg['Subject'] = 'Your Login Code'
    msg['From'] = SENDER_EMAIL
    msg['To'] = receiver_email

    try:
        # Connect to Gmail's SMTP server
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def create_jwt(contact: str, role: str):
    expiration = datetime.utcnow() + timedelta(days=7) # Token valid for 7 days
    payload = {
        "sub": contact,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==========================================
# Pydantic Models
# ==========================================
class OTPRequest(BaseModel):
    contact: str
    role: str

class OTPVerify(BaseModel):
    contact: str
    otp: str
    role: str

# ==========================================
# API ENDPOINTS
# ==========================================
@app.post("/api/auth/request-otp")
async def request_otp(data: OTPRequest):
    # 1. Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    
    # 2. Save it in memory with a 5-minute expiration
    expires_at = time.time() + 300 
    otp_store[data.contact] = {"otp": otp, "expires": expires_at}
    
    print(f"Generated OTP {otp} for {data.contact}") # Useful for testing without sending email

    # 3. Send the email (assuming contact is an email for now)
    if "@" in data.contact:
        email_sent = send_email(data.contact, otp)
        if not email_sent:
            return {"success": False, "message": "Failed to send email. Check backend logs."}
    else:
        return {"success": False, "message": "Phone number SMS not configured yet."}

    return {"success": True, "message": "OTP sent successfully"}


@app.post("/api/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    stored_data = otp_store.get(data.contact)

    # 1. Check if OTP exists
    if not stored_data:
        return {"success": False, "message": "No OTP requested for this email"}

    # 2. Check if OTP is expired
    if time.time() > stored_data["expires"]:
        del otp_store[data.contact] # Clean up
        return {"success": False, "message": "OTP has expired. Please request a new one."}

    # 3. Check if OTP matches
    if stored_data["otp"] == data.otp:
        # Success! Delete the used OTP
        del otp_store[data.contact]
        
        # Generate the JWT session token
        token = create_jwt(data.contact, data.role)
        
        return {
            "success": True,
            "token": token,
            "message": "Logged in successfully"
        }
    else:
        return {"success": False, "message": "Invalid OTP"}