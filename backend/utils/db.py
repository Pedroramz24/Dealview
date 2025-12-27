"""Database connection utilities - Supabase only."""
from supabase import create_client, Client
import os

# Supabase client (singleton)
_supabase_client = None


def get_supabase() -> Client:
    """Get Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        supabase_url = os.environ['SUPABASE_URL']
        supabase_key = os.environ['SUPABASE_SERVICE_KEY']
        _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client
