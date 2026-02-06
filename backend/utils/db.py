"""Database connection utilities - Supabase only."""
from supabase import create_client, Client
import os
import logging

logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    """Get a fresh Supabase client instance using service_role key.
    Creates a new client each time to prevent auth state contamination."""
    supabase_url = os.environ['SUPABASE_URL']
    supabase_key = os.environ['SUPABASE_SERVICE_KEY']
    return create_client(supabase_url, supabase_key)
