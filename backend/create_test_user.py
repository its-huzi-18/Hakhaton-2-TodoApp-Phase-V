"""Create a test user directly in the database."""
import asyncio
import hashlib
from passlib.context import CryptContext

from app.config import settings
from app.db import AsyncSessionLocal, init_db
from app.models import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    password_bytes = password.encode("utf-8")
    normalized = hashlib.sha256(password_bytes).hexdigest()
    return pwd_context.hash(normalized)

async def create_test_user():
    # Initialize database first
    await init_db()
    
    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(User).where(User.email == "test@test.com"))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"User 'test@test.com' already exists! ID: {existing.id}")
            return
        
        # Create user
        hashed_pw = get_password_hash("test1234")
        user = User(email="test@test.com", hashed_password=hashed_pw)
        
        session.add(user)
        await session.commit()
        
        print(f"Created user: test@test.com (password: test1234)")
        print(f"User ID: {user.id}")

if __name__ == "__main__":
    asyncio.run(create_test_user())
