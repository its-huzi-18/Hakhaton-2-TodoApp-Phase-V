# Quickstart Guide: Todo Chatbot

This guide will help you get the AI-powered Todo Chatbot up and running quickly.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Anthropic API key for Claude access
- PostgreSQL database (or use the existing Phase 2 database)

## Setup Instructions

### 1. Clone and Navigate to Project

```bash
cd ai-full-stack-web
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Set up environment variables
# Create .env.local file and add:
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

### 4. Database Setup

The chatbot uses the existing Phase 2 database schema with additional tables for conversations and messages. Make sure your database is set up and the Phase 2 schema is applied.

### 5. Start the Applications

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

## Usage

1. Visit `http://localhost:3000` in your browser
2. Log in to the application
3. Navigate to the Chat page
4. Start interacting with the AI assistant using natural language commands:
   - "Add 'buy groceries' to my todo list"
   - "Show me my tasks"
   - "Mark the first task as complete"
   - "Update task #2 to 'buy milk'"
   - "Delete the third task"

## Key Features

- **Natural Language Processing**: The AI understands and processes your commands in plain English
- **Task Operations**: Full CRUD operations on your todo list via chat
- **Context Awareness**: The AI remembers context from previous messages in the conversation
- **Confirmation Messages**: Clear feedback on actions taken
- **Error Handling**: Helpful responses when commands are ambiguous or fail

## Troubleshooting

- If the AI responses seem slow, check your API key and internet connection
- If tasks aren't appearing, verify your database connection
- For authentication issues, ensure your JWT tokens are properly configured