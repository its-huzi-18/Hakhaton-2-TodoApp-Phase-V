from datetime import datetime
from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models import User


# Security scheme
security = HTTPBearer()


# Token data model
class TokenData(BaseModel):
    user_id: UUID
    email: Optional[str] = None


# JWT Exception
class JWTException(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_token(token: str) -> TokenData:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str = payload.get("sub")
        email: Optional[str] = payload.get("email")

        if user_id is None:
            raise JWTException("Invalid token: missing subject")

        # Convert string ID to UUID
        user_uuid = UUID(user_id) if user_id else None
        return TokenData(user_id=user_uuid, email=email)
    except ValueError:
        # Handle invalid UUID format
        raise JWTException("Invalid token: user ID is not a valid UUID")
    except JWTError as e:
        raise JWTException(f"Invalid token: {str(e)}")


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    token_data = decode_token(token)

    # Fetch user from database
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise JWTException("User not found")

    return user


async def get_current_user_id(
    current_user: Annotated[User, Depends(get_current_user)],
) -> str:
    """Get current user ID (lightweight dependency)."""
    return str(current_user.id)


# Optional: Skip auth for testing
async def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(HTTPBearer(auto_error=False))],
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get current user if token is provided, otherwise None."""
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        token_data = decode_token(token)

        result = await db.execute(select(User).where(User.id == token_data.user_id))
        return result.scalar_one_or_none()
    except JWTException:
        return None
