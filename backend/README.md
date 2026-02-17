# Todo Chatbot Backend

This is the backend API for the AI-powered Todo Chatbot application.

## Tech Stack

- Python 3.11+
- FastAPI
- SQLAlchemy
- PostgreSQL
- OpenAI API

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your configuration.

3. Run the application:
   ```bash
   python main.py
   ```

## API Endpoints

- `POST /api/users/{user_id}/chat` - Send a message to the chatbot

## Configuration

The application can be configured using environment variables:

- `DATABASE_URL` - Database connection string
- `OPENAI_API_KEY` - API key for OpenAI services
- `CLAUDE_MODEL` - Model name for Claude AI (defaults to gpt-3.5-turbo as placeholder)
- `SECRET_KEY` - Secret key for JWT tokens
- `DEBUG` - Enable/disable debug mode