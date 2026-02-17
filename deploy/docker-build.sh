#!/bin/bash

# Script to build Docker images for the Todo Chatbot application
# This script builds both frontend and backend images with optimization

set -e  # Exit on any error

echo "Building Docker images for Todo Chatbot application..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Docker is required but not installed. Aborting."
    exit 1
fi

# Build backend image
echo "Building backend Docker image..."
docker build -f Dockerfile.backend -t todo-backend:latest .
if [ $? -ne 0 ]; then
    echo "Failed to build backend image"
    exit 1
fi

# Build frontend image
echo "Building frontend Docker image..."
docker build -f Dockerfile.frontend -t todo-frontend:latest .
if [ $? -ne 0 ]; then
    echo "Failed to build frontend image"
    exit 1
fi

# Verify images were built
BACKEND_IMAGE=$(docker images -q todo-backend:latest)
if [ -z "$BACKEND_IMAGE" ]; then
    echo "Backend image was not built successfully"
    exit 1
fi

FRONTEND_IMAGE=$(docker images -q todo-frontend:latest)
if [ -z "$FRONTEND_IMAGE" ]; then
    echo "Frontend image was not built successfully"
    exit 1
fi

echo "Docker images built successfully!"
echo "Backend image: todo-backend:latest ($BACKEND_IMAGE)"
echo "Frontend image: todo-frontend:latest ($FRONTEND_IMAGE)"

# Show image sizes
echo "Image sizes:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "(todo-backend|todo-frontend)"