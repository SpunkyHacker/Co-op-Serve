import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

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