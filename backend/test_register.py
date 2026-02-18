import asyncio
import httpx

async def test_register():
    async with httpx.AsyncClient() as client:
        try:
            # Test registration
            response = await client.post(
                "http://localhost:7860/auth/register",
                json={"email": "test@test.com", "password": "test1234"}
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Test login
            if response.status_code == 201:
                login_response = await client.post(
                    "http://localhost:7860/auth/login",
                    json={"email": "test@test.com", "password": "test1234"}
                )
                print(f"Login Status: {login_response.status_code}")
                print(f"Login Response: {login_response.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_register())
