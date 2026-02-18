"""Test tasks endpoint directly."""
import asyncio
import hashlib
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.db import AsyncSessionLocal, init_db
from app.config import settings
from app.models import User, Task
from sqlalchemy import select

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    password_bytes = password.encode("utf-8")
    normalized = hashlib.sha256(password_bytes).hexdigest()
    return pwd_context.hash(normalized)

def create_access_token(user_id: int, email: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

async def test_tasks():
    await init_db()
    
    async with AsyncSessionLocal() as session:
        # Get user
        result = await session.execute(select(User).where(User.email == "test@test.com"))
        user = result.scalar_one_or_none()
        
        if not user:
            print("User not found!")
            return
        
        print(f"Found user: {user.id} ({user.email})")
        
        # Create token
        token = create_access_token(user_id=int(user.id), email=user.email, expires_delta=timedelta(days=7))
        print(f"Token: {token[:50]}...")
        
        # Try to get tasks
        try:
            result = await session.execute(
                select(Task).where(Task.user_id == user.id).order_by(Task.created_at.desc())
            )
            tasks = result.scalars().all()
            print(f"Found {len(tasks)} tasks")
            for t in tasks:
                print(f"  - {t.id}: {t.title} ({t.is_completed})")
        except Exception as e:
            print(f"Error fetching tasks: {e}")
            import traceback
            traceback.print_exc()
        
        # Create a test task
        try:
            new_task = Task(title="Test Task", description="Test Description", user_id=int(user.id))
            session.add(new_task)
            await session.commit()
            print(f"Created task: {new_task.id}")
        except Exception as e:
            print(f"Error creating task: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_tasks())
