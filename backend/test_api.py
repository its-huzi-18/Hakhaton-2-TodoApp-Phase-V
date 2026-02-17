import asyncio
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables
load_dotenv()

# Get API key and model
api_key = os.getenv("OPENROUTER_API_KEY")
model_name = os.getenv("AI_MODEL", "openchat/openchat-7b:free")

print(f"API Key exists: {bool(api_key)}")
print(f"Model name: {model_name}")

if not api_key:
    print("ERROR: OPENROUTER_API_KEY not found in environment!")
else:
    # Create client
    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )

    async def test_api_call():
        try:
            print("\nTesting API call...")
            response = await client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "Hello, world!"}],
                temperature=0.7
            )

            content = response.choices[0].message.content
            if content:
                # Handle potential Unicode characters
                try:
                    print(f"Success! Response: {content[:100]}...")
                except UnicodeEncodeError:
                    print(f"Success! Response (Unicode chars present): Received response of length {len(content)}")
            else:
                print("Received empty response")
        except Exception as e:
            print(f"Error occurred: {e}")
            import traceback
            traceback.print_exc()

    # Run the test
    asyncio.run(test_api_call())