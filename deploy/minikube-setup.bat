@echo off
REM Script to set up and deploy the Todo Chatbot application on Minikube for Windows
REM This script addresses the issues encountered during the deployment process

echo Starting Minikube setup for Todo Chatbot deployment...

REM Check if Minikube is installed
where minikube >nul 2>nul
if errorlevel 1 (
    echo Error: minikube is not installed. Please install it first.
    exit /b 1
)

REM Check if kubectl is installed
where kubectl >nul 2>nul
if errorlevel 1 (
    echo Error: kubectl is not installed. Please install it first.
    exit /b 1
)

REM Check if Helm is installed
where helm >nul 2>nul
if errorlevel 1 (
    echo Error: helm is not installed. Please install it first.
    exit /b 1
)

REM Start Minikube with appropriate resources for the current system
echo Starting Minikube cluster...
minikube start --driver=docker --cpus=2 --memory=2048 --disk-size=8g

REM Enable required addons
echo Enabling required addons...
minikube addons enable ingress
minikube addons enable metrics-server

REM Verify cluster status
echo Verifying cluster status...
kubectl cluster-info

REM Set Docker environment to use Minikube's Docker daemon
echo Setting Docker environment to use Minikube...
FOR /f "tokens=*" %%i IN ('minikube -p minikube docker-env --shell cmd') DO @%%i

REM Build Docker images using a smaller context to avoid timeouts
echo Building Docker images...

REM Build backend image
echo Building backend image...
docker build -t todo-backend:latest -f Dockerfile.backend . --no-cache

REM Build frontend image
echo Building frontend image...
docker build -t todo-frontend:latest -f Dockerfile.frontend . --no-cache

REM Verify images were built
echo Verifying Docker images...
docker images | findstr todo-

REM Install the Helm chart
echo Installing Helm chart...
cd k8s\todo-chatbot
helm install todo-chatbot . --values values.yaml

REM Wait for pods to be ready
echo Waiting for pods to be ready...
kubectl wait --for=condition=ready pod -l app=todo-frontend --timeout=300s
kubectl wait --for=condition=ready pod -l app=todo-backend --timeout=300s

REM Verify the deployment
echo Verifying deployment...
kubectl get pods
kubectl get services
kubectl get ingress

REM Show the application URL
echo Application is available at:
minikube service todo-frontend-service --url

echo Setup complete!