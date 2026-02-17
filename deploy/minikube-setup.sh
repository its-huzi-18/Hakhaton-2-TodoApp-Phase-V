#!/bin/bash

# Script to set up and deploy the Todo Chatbot application on Minikube
# This script addresses the issues encountered during the deployment process

set -e  # Exit on any error

echo "Starting Minikube setup for Todo Chatbot deployment..."

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: minikube is not installed. Please install it first."
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed. Please install it first."
    exit 1
fi

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo "Error: helm is not installed. Please install it first."
    exit 1
fi

# Start Minikube with appropriate resources for the current system
echo "Starting Minikube cluster..."
minikube start --driver=docker --cpus=2 --memory=2048 --disk-size=8g

# Enable required addons
echo "Enabling required addons..."
minikube addons enable ingress
minikube addons enable metrics-server

# Verify cluster status
echo "Verifying cluster status..."
kubectl cluster-info

# Set Docker environment to use Minikube's Docker daemon
echo "Setting Docker environment to use Minikube..."
eval $(minikube -p minikube docker-env)

# Build Docker images using a smaller context to avoid timeouts
echo "Building Docker images..."

# Build backend image
echo "Building backend image..."
docker build -t todo-backend:latest -f Dockerfile.backend . --no-cache

# Build frontend image
echo "Building frontend image..."
docker build -t todo-frontend:latest -f Dockerfile.frontend . --no-cache

# Verify images were built
echo "Verifying Docker images..."
docker images | grep todo-

# Install the Helm chart
echo "Installing Helm chart..."
cd k8s/todo-chatbot
helm install todo-chatbot . --values values.yaml

# Wait for pods to be ready
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=todo-frontend --timeout=300s
kubectl wait --for=condition=ready pod -l app=todo-backend --timeout=300s

# Verify the deployment
echo "Verifying deployment..."
kubectl get pods
kubectl get services
kubectl get ingress

# Show the application URL
echo "Application is available at:"
minikube service todo-frontend-service --url

echo "Setup complete!"