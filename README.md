# Todo Chatbot Kubernetes Deployment

This document provides instructions for deploying the Todo Chatbot application on a local Kubernetes cluster using Minikube.

## Prerequisites

- Docker Desktop
- Minikube
- kubectl
- Helm 3
- Git

## Deployment Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Start Minikube

```bash
minikube start --driver=docker --cpus=2 --memory=2048 --disk-size=8g
```

### 3. Enable Required Addons

```bash
minikube addons enable ingress
minikube addons enable metrics-server
```

### 4. Set Docker Environment

```bash
# On Linux/macOS:
eval $(minikube docker-env)

# On Windows (PowerShell):
& minikube -p minikube docker-env | Invoke-Expression

# On Windows (Command Prompt):
FOR /f "tokens=*" %i IN ('minikube -p minikube docker-env --shell cmd') DO @%i
```

### 5. Build Docker Images

```bash
# Build backend image
docker build -t todo-backend:latest -f Dockerfile.backend . --no-cache

# Build frontend image
docker build -t todo-frontend:latest -f Dockerfile.frontend . --no-cache
```

### 6. Deploy Using Helm

```bash
cd k8s/todo-chatbot
helm install todo-chatbot . --values values.yaml
```

### 7. Verify Deployment

```bash
kubectl get pods
kubectl get services
kubectl get ingress
```

### 8. Access the Application

```bash
# Get the frontend service URL
minikube service todo-frontend-service --url

# Or access via ingress if configured
minikube tunnel  # Run in a separate terminal
```

## Alternative: Automated Deployment

Run the automated deployment script:

```bash
# On Linux/macOS:
chmod +x deploy/minikube-setup.sh
./deploy/minikube-setup.sh

# On Windows:
deploy\minikube-setup.bat
```

## Troubleshooting

Refer to the [troubleshooting guide](deploy/troubleshooting.md) for common issues and solutions.

## Scaling and Management

### Scale the Application

```bash
# Scale frontend
kubectl scale deployment todo-chatbot-frontend --replicas=2

# Scale backend
kubectl scale deployment todo-chatbot-backend --replicas=2
```

### Check Resource Usage

```bash
# Check resource usage
kubectl top nodes
kubectl top pods
```

### View Logs

```bash
# View frontend logs
kubectl logs -l app=todo-frontend

# View backend logs
kubectl logs -l app=todo-backend
```

## Cleanup

To remove the deployment:

```bash
helm uninstall todo-chatbot
```

To stop and delete the Minikube cluster:

```bash
minikube stop
minikube delete
```

## Architecture

The deployment consists of:

- **Frontend**: React/Next.js application served via Node.js
- **Backend**: Python FastAPI application with REST API
- **Database**: PostgreSQL for persistent storage
- **Event Streaming**: Kafka/Dapr for event-driven communication
- **Ingress**: Nginx ingress controller for external access
- **Monitoring**: Metrics server for resource monitoring
- **Service Mesh**: Dapr sidecars for service invocation, state management, and pub/sub

All components are deployed as Kubernetes deployments with corresponding services, and the ingress routes traffic to the frontend service. The architecture follows event-driven principles with loose coupling between services, adhering to the project constitution requirements.

## Constitution Compliance

This deployment adheres to the project constitution by:
- Implementing an event-driven architecture with asynchronous communication
- Using Dapr for service invocation, state management, and pub/sub
- Ensuring infrastructure abstraction via Dapr components
- Maintaining loose coupling between services
- Supporting deployment on both Minikube (local) and cloud Kubernetes
- Implementing proper secret management via Kubernetes secrets"# hakathon2-phase5" 
"# hakathon2-phase5" 
