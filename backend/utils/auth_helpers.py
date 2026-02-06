"""Authentication and JWT helper functions - Supabase only."""
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timezone, timedelta
import os
import logging
import httpx

from models.user import User
from utils.db import get_supabase

# Initialize
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 43200))


async def get_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    """Extract user ID from Supabase token via direct HTTP call.
    Avoids using the singleton supabase client for auth to prevent
    PostgREST header contamination."""
    token = credentials.credentials
    supabase_url = os.environ['SUPABASE_URL']
    anon_key = os.environ['SUPABASE_ANON_KEY']
    try:
        resp = httpx.get(
            f"{supabase_url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": anon_key},
            timeout=10
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        return resp.json()["id"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from Supabase JWT token."""
    supabase = get_supabase()
    try:
        token = credentials.credentials
        
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Get user profile from Supabase
        user_data = user_response.user
        
        # Create User model from Supabase auth data
        return User(
            id=user_data.id,
            email=user_data.email,
            full_name=user_data.user_metadata.get('full_name', ''),
            phone=user_data.user_metadata.get('phone'),
            role=user_data.user_metadata.get('role', 'broker')
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


async def get_current_user_supabase(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Supabase JWT token and return user info."""
    supabase = get_supabase()
    try:
        token = credentials.credentials
        
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Return user info from Supabase
        return user_response.user
        
    except Exception as e:
        logger.error(f"Supabase auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")
