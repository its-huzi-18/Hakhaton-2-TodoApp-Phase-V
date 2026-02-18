"""Check database tables."""
import asyncio
from app.db import engine
from sqlalchemy import text

async def check_tables():
    async with engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """))
        tables = result.fetchall()
        print("Tables in database:")
        for t in tables:
            print(f"  - {t[0]}")
        
        # Check user table structure
        print("\nUser table columns:")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            ORDER BY ordinal_position
        """))
        for col in result.fetchall():
            print(f"  {col[0]}: {col[1]}")
        
        # Check task table structure
        print("\nTask table columns:")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'task' 
            ORDER BY ordinal_position
        """))
        for col in result.fetchall():
            print(f"  {col[0]}: {col[1]}")

if __name__ == "__main__":
    asyncio.run(check_tables())
