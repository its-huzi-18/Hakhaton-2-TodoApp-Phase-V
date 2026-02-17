# Quickstart Guide: Todo Chatbot on Kubernetes

## Overview
This guide provides step-by-step instructions to deploy the Todo Chatbot application on a local Kubernetes cluster using Minikube and AI-assisted DevOps tools.

## Prerequisites

### System Requirements
- Operating System: Windows, macOS, or Linux
- RAM: At least 8GB (16GB recommended for optimal performance)
- Disk Space: At least 20GB free space
- CPU: Multi-core processor with virtualization support

### Required Tools
1. **Docker Desktop** - Container runtime and image management
2. **Minikube** - Local Kubernetes cluster
3. **kubectl** - Kubernetes command-line tool
4. **Helm** - Kubernetes package manager
5. **Gordon** - AI Docker Assistant
6. **kubectl-ai** - AI-enhanced kubectl
7. **Kagent** - AI Kubernetes Agent

### Installation Steps

#### Windows
```bash
# Install Chocolatey (if not already installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install required tools
choco install docker-desktop minikube kubernetes-helm
```

#### macOS
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install docker minikube kubectl helm
```

#### Linux (Ubuntu/Debian)
```bash
# Install Docker
sudo apt-get update
sudo apt-get install docker.io

# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### AI Tools Installation
Contact your system administrator or follow the specific installation guides for Gordon, kubectl-ai, and Kagent as they are proprietary AI-assisted tools.

## Deployment Steps

### Step 1: Start Minikube Cluster
```bash
# Start Minikube with sufficient resources
minikube start --cpus=4 --memory=8192 --disk-size=20g

# Verify cluster is running
kubectl cluster-info
```

### Step 2: Enable Required Addons
```bash
# Enable ingress controller for external access
minikube addons enable ingress

# Enable metrics server for monitoring
minikube addons enable metrics-server
```

### Step 3: Containerize Applications with Gordon
```bash
# Navigate to the frontend directory
cd frontend

# Generate Dockerfile for frontend using Gordon
gordon create-dockerfile --service frontend --tech react --output ./Dockerfile

# Navigate to the backend directory
cd ../backend

# Generate Dockerfile for backend using Gordon
gordon create-dockerfile --service backend --tech fastapi --output ./Dockerfile
```

### Step 4: Build Docker Images
```bash
# Set Docker environment to use Minikube's Docker daemon
eval $(minikube docker-env)

# Build frontend image
docker build -t todo-frontend:latest ./frontend

# Build backend image
docker build -t todo-backend:latest ./backend
```

### Step 5: Generate Helm Chart with Kagent
```bash
# Use Kagent to generate Helm chart
kagent generate chart --name todo-chatbot --output ./k8s

# Customize the generated values.yaml as needed
# (Edit ./k8s/todo-chatbot/values.yaml)
```

### Step 6: Deploy Application with Helm
```bash
# Navigate to the Helm chart directory
cd ./k8s/todo-chatbot

# Install the application using Helm
helm install todo-chatbot . --values values.yaml

# Verify the deployment
kubectl get pods
kubectl get services
kubectl get ingress
```

### Step 7: Access the Application
```bash
# Get the Minikube IP
minikube ip

# Access the application via browser
minikube service todo-frontend-service --url
```

## Verification Steps

### Check Pod Status
```bash
# View all pods
kubectl get pods

# View detailed pod information
kubectl describe pod <pod-name>
```

### Check Service Status
```bash
# View all services
kubectl get services

# Check service endpoints
kubectl get endpoints
```

### Check Logs
```bash
# View frontend logs
kubectl logs -l app=todo-frontend

# View backend logs
kubectl logs -l app=todo-backend
```

### Test API Endpoints
```bash
# Port forward to access backend API
kubectl port-forward svc/todo-backend-service 8000:8000

# Test API endpoint (in another terminal)
curl http://localhost:8000/todos
```

## AI-Assisted Operations

### Using kubectl-ai for Troubleshooting
```bash
# Ask kubectl-ai to diagnose issues
kubectl-ai why pod todo-frontend is not ready

# Ask kubectl-ai to suggest resource optimizations
kubectl-ai suggest optimizations for deployment todo-frontend
```

### Using Kagent for Management
```bash
# Use Kagent to monitor the deployment
kagent monitor deployment todo-chatbot

# Use Kagent to scale services
kagent scale deployment todo-frontend --replicas=2
```

## Common Issues and Solutions

### Issue: Insufficient Resources
**Symptoms**: Pods stuck in Pending state
**Solution**: Increase Minikube resources
```bash
minikube delete
minikube start --cpus=4 --memory=8192 --disk-size=20g
```

### Issue: ImagePullBackOff
**Symptoms**: Pods can't start due to image pull errors
**Solution**: Ensure Docker images are built in Minikube's environment
```bash
eval $(minikube docker-env)
docker build -t todo-frontend:latest ./frontend
```

### Issue: Service Unavailable
**Symptoms**: Cannot access the application
**Solution**: Check if ingress is properly configured
```bash
kubectl get ingress
minikube addons enable ingress
```

## Cleanup
```bash
# Uninstall the Helm release
helm uninstall todo-chatbot

# Stop Minikube
minikube stop

# Optionally delete the Minikube VM
minikube delete
```

## Next Steps
1. Explore advanced Helm configurations for different environments
2. Implement CI/CD pipeline for automated deployments
3. Set up monitoring and alerting with Prometheus and Grafana
4. Add security scanning to the containerization process
5. Implement backup and recovery procedures for persistent data