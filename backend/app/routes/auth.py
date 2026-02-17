from datetime import datetime, timedelta
import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.config import settings
from app.db import get_db
from app.models import User, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """
    Hash password safely:
    SHA-256 normalize → bcrypt
    (prevents bcrypt 72-byte crash)
    """
    password_bytes = password.encode("utf-8")
    normalized = hashlib.sha256(password_bytes).hexdigest()
    return pwd_context.hash(normalized)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password using same normalization
    """
    password_bytes = plain_password.encode("utf-8")
    normalized = hashlib.sha256(password_bytes).hexdigest()
    return pwd_context.verify(normalized, hashed_password)



def create_access_token(user_id: str, email: str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)

    to_encode = {"sub": str(user_id), "email": email, "exp": expire}
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.post("/login")
async def login(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Login a user and return JWT token."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Verify password
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Create access token
    access_token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        expires_delta=timedelta(days=7),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
        },
    }


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get current user profile."""
    return current_user
