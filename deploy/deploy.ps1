# PowerShell deployment script for Todo Chatbot on Kubernetes

Write-Host "Starting deployment preparation for Todo Chatbot to Kubernetes..." -ForegroundColor Green

# Check if kubectl is available
if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "kubectl is required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

# Check if Helm is available
if (!(Get-Command helm -ErrorAction SilentlyContinue)) {
    Write-Host "Helm is required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

# Check if Docker is available
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

# Build Docker images
Write-Host "Building Docker images..." -ForegroundColor Yellow
docker build -f Dockerfile.backend -t todo-backend:latest .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build todo-backend image" -ForegroundColor Red
    exit 1
}

docker build -f Dockerfile.frontend -t todo-frontend:latest .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build todo-frontend image" -ForegroundColor Red
    exit 1
}

Write-Host "Docker images built successfully!" -ForegroundColor Green

# Lint the Helm chart
Write-Host "Linting Helm chart..." -ForegroundColor Yellow
Set-Location k8s\todo-chatbot
helm lint .
Set-Location ..\..

Write-Host "Helm chart linted successfully!" -ForegroundColor Green

# Template the Helm chart to verify it's valid
Write-Host "Validating Helm chart templates..." -ForegroundColor Yellow
helm template todo-chatbot ./k8s/todo-chatbot --values ./k8s/todo-chatbot/values.yaml | Out-Null

Write-Host "Helm chart templates validated successfully!" -ForegroundColor Green

Write-Host "Deployment preparation completed successfully!" -ForegroundColor Green
Write-Host "To deploy to a running Kubernetes cluster:" -ForegroundColor Yellow
Write-Host "1. Start your Kubernetes cluster (e.g., minikube start --driver=docker)" -ForegroundColor Yellow
Write-Host "2. Set Docker environment to use cluster's daemon (e.g., minikube docker-env | Invoke-Expression)" -ForegroundColor Yellow
Write-Host "3. Run: helm install todo-chatbot ./k8s/todo-chatbot --values ./k8s/todo-chatbot/values.yaml" -ForegroundColor Yellow