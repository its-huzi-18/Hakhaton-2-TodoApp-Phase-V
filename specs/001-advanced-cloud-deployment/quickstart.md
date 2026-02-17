# Quickstart Guide: Advanced Cloud Deployment

## Overview
This guide provides step-by-step instructions to set up and run the Advanced Cloud Deployment for the event-driven Todo Chatbot system on your local machine using Minikube.

## Prerequisites
- Docker Desktop (with Kubernetes enabled)
- Minikube v1.28+
- kubectl
- Helm 3
- Node.js 18+ (for local development)
- Dapr CLI

## Step 1: Install Dapr
First, install Dapr on your local machine:
```bash
# Download and install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Initialize Dapr in your local environment
dapr init
```

## Step 2: Start Minikube
Start a local Kubernetes cluster with sufficient resources:
```bash
minikube start --driver=docker --cpus=4 --memory=8192 --disk-size=20g
```

## Step 3: Install Dapr on Minikube
Install Dapr runtime in your Minikube cluster:
```bash
# Wait for minikube to be ready
kubectl wait --for=condition=Ready node --all --timeout=120s

# Install Dapr on the cluster
dapr init -k
```

## Step 4: Clone the Repository
```bash
git clone <repository-url>
cd <repository-directory>
```

## Step 5: Set Docker Environment
Configure Docker to build images directly in the Minikube environment:
```bash
# On Windows (PowerShell):
& minikube -p minikube docker-env | Invoke-Expression

# On Linux/macOS:
eval $(minikube docker-env)
```

## Step 6: Build Docker Images
Build the necessary Docker images for the services:
```bash
# Build task service image
docker build -t task-service:latest -f backend/task-service/Dockerfile .

# Build reminder service image
docker build -t reminder-service:latest -f backend/reminder-service/Dockerfile .

# Build recurring task engine image
docker build -t recurring-task-engine:latest -f backend/recurring-task-engine/Dockerfile .

# Build notification service image
docker build -t notification-service:latest -f backend/notification-service/Dockerfile .

# Build audit service image
docker build -t audit-service:latest -f backend/audit-service/Dockerfile .

# Build frontend image
docker build -t frontend:latest -f frontend/Dockerfile .
```

## Step 7: Deploy with Helm
Deploy the application using the provided Helm chart:
```bash
# Navigate to the Helm chart directory
cd k8s/todo-chatbot

# Install the application
helm install todo-chatbot . --values values-dev.yaml
```

## Step 8: Verify Deployment
Check that all services are running:
```bash
# Check pods
kubectl get pods

# Check services
kubectl get services

# Check Dapr sidecars
kubectl get pods -l app.kubernetes.io/part-of=dapr
```

## Step 9: Access the Application
Access the application through Minikube:
```bash
# Get the frontend service URL
minikube service todo-frontend-service --url

# Or use tunnel to access via localhost (run in separate terminal)
minikube tunnel
```

## Step 10: Test the System
1. Open the frontend in your browser
2. Create a task with a due date to test the event-driven workflow
3. Monitor the logs to see the event flow:
   ```bash
   # View task service logs
   kubectl logs -l app=task-service -f
   
   # View reminder service logs
   kubectl logs -l app=reminder-service -f
   ```

## Troubleshooting
- If services don't start, check Dapr placement service is running: `kubectl get pods -l app=dapr-placement`
- If events aren't flowing, verify the pub/sub component is configured: `kubectl get components.dapr.io`
- For database connection issues, check the PostgreSQL pod status: `kubectl get pods -l app=postgresql`

## Next Steps
- Explore the API documentation at `/api/docs`
- Review the event schemas in the `contracts/` directory
- Customize the Helm values for your specific environment
- Set up monitoring and observability components