from supabase import create_client, Client
from dotenv import load_dotenv
import os
from flask import request

# Load environment variables from .env file
load_dotenv(dotenv_path=".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://frojcdtvkoacfsjsadzl.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyb2pjZHR2a29hY2ZzanNhZHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzE5NzQsImV4cCI6MjA0NjU0Nzk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8")

print("SUPABASE_ANON_KEY starts with:", SUPABASE_ANON_KEY[:20] if SUPABASE_ANON_KEY else "None")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise Exception("SUPABASE_URL and SUPABASE_ANON_KEY must be set in the .env file.")

# Create base client with anon key (for public operations only)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_user_supabase(jwt: str) -> Client:
    """Return a supabase client with the user's JWT set for RLS."""
    user_supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    user_supabase.auth.session = {"access_token": jwt}
    return user_supabase

def get_authenticated_supabase(jwt: str = None) -> Client:
    """Get authenticated Supabase client. If no JWT provided, returns base client."""
    if jwt:
        return get_user_supabase(jwt)
    return supabase

def get_supabase_from_request() -> Client:
    """Extract JWT from request headers and return authenticated Supabase client."""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        jwt_token = auth_header.split(' ')[1]
        return get_authenticated_supabase(jwt_token)
    return supabase 