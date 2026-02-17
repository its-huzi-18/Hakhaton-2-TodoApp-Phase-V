#!/usr/bin/env python3
"""
Test script to verify the chat endpoints are working correctly
"""
import asyncio
import uuid
from typing import Optional
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.models import User, Conversation
from app.auth.jwt import create_access_token
from sqlmodel import Session, select
from unittest.mock import AsyncMock, patch


def test_chat_endpoints():
    """Test the chat endpoints to reproduce and verify the fix for the 422 error"""
    
    with TestClient(app) as client:
        # First, let's create a test user
        # Note: This is a simplified test - in reality, you'd need to register a user first
        
        # For now, let's just check the schema validation by making a request
        # with an invalid conversation ID to see if we get proper error messages
        
        # Test with invalid conversation ID format
        response = client.post(
            "/api/conversations/invalid-id/chat",
            headers={"Authorization": "Bearer fake-token"},
            json={"content": "Hello"}
        )
        
        print(f"Response status for invalid ID: {response.status_code}")
        print(f"Response detail: {response.json()}")
        
        # Test with valid UUID but non-existent conversation
        fake_uuid = str(uuid.uuid4())
        response = client.post(
            f"/api/conversations/{fake_uuid}/chat",
            headers={"Authorization": "Bearer fake-token"},
            json={"content": "Hello"}
        )
        
        print(f"Response status for non-existent conversation: {response.status_code}")
        print(f"Response detail: {response.json()}")
        
        # Test with empty content
        response = client.post(
            f"/api/conversations/{fake_uuid}/chat",
            headers={"Authorization": "Bearer fake-token"},
            json={"content": ""}
        )
        
        print(f"Response status for empty content: {response.status_code}")
        print(f"Response detail: {response.json()}")


if __name__ == "__main__":
    test_chat_endpoints()