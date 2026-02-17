#!/bin/bash

# Deployment script for Todo Chatbot on Kubernetes

set -e  # Exit on any error

echo "Starting deployment preparation for Todo Chatbot to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is required but not installed. Aborting."
    exit 1
fi

# Check if Helm is available
if ! command -v helm &> /dev/null; then
    echo "Helm is required but not installed. Aborting."
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Docker is required but not installed. Aborting."
    exit 1
fi

# Build Docker images
echo "Building Docker images..."
docker build -f Dockerfile.backend -t todo-backend:latest .
docker build -f Dockerfile.frontend -t todo-frontend:latest .

# Verify images were built
if [[ "$(docker images -q todo-backend:latest 2> /dev/null)" == "" ]]; then
    echo "Failed to build todo-backend image"
    exit 1
fi

if [[ "$(docker images -q todo-frontend:latest 2> /dev/null)" == "" ]]; then
    echo "Failed to build todo-frontend image"
    exit 1
fi

echo "Docker images built successfully!"

# Lint the Helm chart
echo "Linting Helm chart..."
cd k8s/todo-chatbot
helm lint .
cd ../..

echo "Helm chart linted successfully!"

# Template the Helm chart to verify it's valid
echo "Validating Helm chart templates..."
helm template todo-chatbot ./k8s/todo-chatbot --values ./k8s/todo-chatbot/values.yaml > /dev/null

echo "Helm chart templates validated successfully!"

echo "Deployment preparation completed successfully!"
echo "To deploy to a running Kubernetes cluster:"
echo "1. Start your Kubernetes cluster (e.g., minikube start --driver=docker)"
echo "2. Set Docker environment to use cluster's daemon (e.g., eval \$(minikube docker-env))"
echo "3. Run: helm install todo-chatbot ./k8s/todo-chatbot --values ./k8s/todo-chatbot/values.yaml"