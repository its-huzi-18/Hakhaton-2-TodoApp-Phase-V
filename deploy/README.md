# Todo Chatbot Kubernetes Deployment

This document provides instructions for deploying the Todo Chatbot application to a Kubernetes cluster using Helm charts.

## Prerequisites

- Docker Desktop
- Minikube
- kubectl
- Helm 3
- Gordon (AI Docker Assistant) - optional
- kubectl-ai - optional
- Kagent - optional

## Quick Start

### 1. Start Minikube

```bash
minikube start --driver=docker --cpus=2 --memory=4096mb
```

### 2. Enable required addons

```bash
minikube addons enable ingress
minikube addons enable metrics-server
```

### 3. Set Docker environment

```bash
eval $(minikube docker-env)
```

### 4. Build Docker images

```bash
# Build backend image
docker build -f Dockerfile.backend -t todo-backend:latest .

# Build frontend image
docker build -f Dockerfile.frontend -t todo-frontend:latest .
```

### 5. Deploy using Helm

```bash
helm install todo-chatbot ./k8s/todo-chatbot --values ./k8s/todo-chatbot/values.yaml
```

## Using Deployment Scripts

### Linux/macOS:
```bash
./deploy/deploy.sh
```

### Windows:
```powershell
.\deploy\deploy.ps1
```

## Accessing the Application

After deployment, access the application using:

```bash
minikube service todo-chatbot-frontend-service
```

Or get the URL directly:

```bash
minikube service todo-chatbot-frontend-service --url
```

## Configuration

The application can be configured using the `values.yaml` file in the Helm chart. Key configuration options include:

- `frontend.image.repository` - Frontend Docker image repository
- `backend.image.repository` - Backend Docker image repository
- `database.enabled` - Enable/disable database component
- `resources` - Resource limits and requests
- `replicaCount` - Number of pod replicas

## Troubleshooting

### Common Issues

1. **ImagePullBackOff**: Ensure Docker images are built in Minikube's Docker environment:
   ```bash
   eval $(minikube docker-env)
   docker build -t todo-backend:latest .
   ```

2. **Insufficient Resources**: Increase Minikube resources:
   ```bash
   minikube delete
   minikube start --cpus=4 --memory=8192mb
   ```

3. **Ingress Not Working**: Verify ingress addon is enabled:
   ```bash
   minikube addons enable ingress
   ```

### Useful Commands

- Check pod status: `kubectl get pods`
- Check services: `kubectl get services`
- Check logs: `kubectl logs -l app=todo-frontend`
- Port forward for testing: `kubectl port-forward svc/todo-chatbot-backend-service 8000:8000`

## Scaling

To scale the application:

```bash
# Scale frontend
kubectl scale deployment todo-chatbot-frontend --replicas=3

# Scale backend
kubectl scale deployment todo-chatbot-backend --replicas=3
```

## Cleanup

To remove the deployment:

```bash
helm uninstall todo-chatbot
```