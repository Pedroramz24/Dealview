"""Database connection utilities."""
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client, Client
import os

# MongoDB client (singleton)
_mongo_client = None
_mongo_db = None

# Supabase client (singleton)
_supabase_client = None


def get_db():
    """Get MongoDB database instance."""
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        mongo_url = os.environ['MONGO_URL']
        _mongo_client = AsyncIOMotorClient(mongo_url)
        _mongo_db = _mongo_client[os.environ['DB_NAME']]
    return _mongo_db


def get_supabase() -> Client:
    """Get Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        supabase_url = os.environ['SUPABASE_URL']
        supabase_key = os.environ['SUPABASE_SERVICE_KEY']
        _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client
