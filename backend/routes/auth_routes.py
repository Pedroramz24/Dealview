"""Authentication routes."""
from fastapi import APIRouter, HTTPException, Depends
from models import User, UserCreate, UserLogin, Token
from utils.auth_helpers import verify_password, get_password_hash, create_access_token, get_current_user
from utils.db import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user."""
    db = get_db()
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role="agent"
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['hashed_password'] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password."""
    db = get_db()
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get('hashed_password', '')):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user_doc.pop('hashed_password', None)
    user = User(**user_doc)
    
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


# ============================================================
# MEMBERSHIP & ONBOARDING ENDPOINTS (TO BE ADDED IN PHASE 2)
# ============================================================
# @router.get("/membership/status")
# async def check_membership_status(current_user: User = Depends(get_current_user)):
#     """Check if user has active membership"""
#     pass
#
# @router.post("/onboarding/complete")
# async def complete_onboarding(...):
#     """Complete onboarding wizard and save buy box preferences"""
#     pass
