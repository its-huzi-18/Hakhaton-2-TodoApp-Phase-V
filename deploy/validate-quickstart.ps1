#!/bin/bash
# Quickstart validation script for Advanced Cloud Deployment

echo "🔍 Validating Quickstart Guide for Advanced Cloud Deployment..."

# Check if we're in the right directory
if [ ! -f "specs/001-advanced-cloud-deployment/spec.md" ]; then
    echo "❌ Not in the project root directory or spec file not found"
    exit 1
fi

echo "✅ Confirmed we're in the project root directory"

# Check prerequisites
echo ""
echo "📋 Checking Prerequisites..."

# Check Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    echo "   Docker version: $DOCKER_VERSION"
else
    echo "❌ Docker is not installed"
    exit 1
fi

# Check kubectl
if command -v kubectl &> /dev/null; then
    echo "✅ kubectl is installed"
    KUBECTL_VERSION=$(kubectl version --client --short | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    echo "   kubectl version: $KUBECTL_VERSION"
else
    echo "❌ kubectl is not installed"
    exit 1
fi

# Check Helm
if command -v helm &> /dev/null; then
    echo "✅ Helm is installed"
    HELM_VERSION=$(helm version --short | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    echo "   Helm version: $HELM_VERSION"
else
    echo "❌ Helm is not installed"
    exit 1
fi

# Check Dapr
if command -v dapr &> /dev/null; then
    echo "✅ Dapr CLI is installed"
    DAPR_VERSION=$(dapr --version | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    echo "   Dapr version: $DA PR_VERSION"
else
    echo "❌ Dapr CLI is not installed"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed"
    NODE_VERSION=$(node --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    echo "   Node.js version: $NODE_VERSION"
else
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check Minikube
if command -v minikube &> /dev/null; then
    echo "✅ Minikube is installed"
    MINIKUBE_VERSION=$(minikube version --short | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')
    echo "   Minikube version: $MINIKUBE_VERSION"
else
    echo "❌ Minikube is not installed"
    exit 1
fi

echo ""
echo "🔄 Checking if Minikube is running..."

MINIKUBE_STATUS=$(minikube status --format='{{.Host}}' 2>/dev/null)
if [ "$MINIKUBE_STATUS" = "Running" ]; then
    echo "✅ Minikube is running"
else
    echo "❌ Minikube is not running. Please start it with: minikube start --driver=docker --cpus=4 --memory=8192 --disk-size=20g"
    exit 1
fi

echo ""
echo "🔄 Checking if Dapr is installed in Minikube..."

if kubectl get pods -n dapr-system &> /dev/null; then
    echo "✅ Dapr is installed in Kubernetes cluster"
    DAPR_PODS=$(kubectl get pods -n dapr-system --no-headers | wc -l)
    echo "   Dapr pods running: $DA PR_PODS"
else
    echo "❌ Dapr is not installed in Kubernetes cluster"
    echo "   Install with: dapr init -k"
    exit 1
fi

echo ""
echo "📁 Checking project structure..."

# Check backend services
BACKEND_SERVICES=("task-service" "reminder-service" "recurring-task-engine" "notification-service" "audit-service")
MISSING_SERVICES=()

for service in "${BACKEND_SERVICES[@]}"; do
    if [ -d "backend/$service" ]; then
        echo "✅ $service directory exists"
    else
        echo "❌ $service directory missing"
        MISSING_SERVICES+=("$service")
    fi
done

if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
    echo "❌ Missing backend services: ${MISSING_SERVICES[*]}"
    exit 1
fi

# Check frontend directory
if [ -d "frontend" ]; then
    echo "✅ Frontend directory exists"
else
    echo "❌ Frontend directory missing"
    exit 1
fi

echo ""
echo "📦 Checking Helm chart..."

if [ -d "k8s/todo-chatbot" ]; then
    echo "✅ Helm chart directory exists"
    
    # Check for required Helm files
    if [ -f "k8s/todo-chatbot/Chart.yaml" ]; then
        echo "✅ Chart.yaml exists"
    else
        echo "❌ Chart.yaml missing"
        exit 1
    fi
    
    if [ -f "k8s/todo-chatbot/values.yaml" ]; then
        echo "✅ values.yaml exists"
    else
        echo "❌ values.yaml missing"
        exit 1
    fi
    
    if [ -d "k8s/todo-chatbot/templates" ]; then
        echo "✅ templates directory exists"
        TEMPLATE_COUNT=$(ls k8s/todo-chatbot/templates/*.yaml | wc -l)
        echo "   Template files: $TEMPLATE_COUNT"
    else
        echo "❌ templates directory missing"
        exit 1
    fi
else
    echo "❌ Helm chart directory missing"
    exit 1
fi

echo ""
echo "🔍 Checking Dapr components..."

if kubectl get components.dapr.io &> /dev/null; then
    COMPONENT_COUNT=$(kubectl get components.dapr.io -o json | jq '.items | length' 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ Dapr components exist: $COMPONENT_COUNT components"
    else
        echo "✅ Dapr components exist (count unknown)"
    fi
else
    echo "❌ No Dapr components found"
    exit 1
fi

echo ""
echo "🧪 Checking if services are deployed..."

SERVICES_TO_CHECK=("task-service" "reminder-service" "recurring-task-engine" "notification-service" "audit-service")

for service in "${SERVICES_TO_CHECK[@]}"; do
    if kubectl get service "$service" &> /dev/null; then
        echo "✅ $service exists in cluster"
    else
        echo "⚠️  $service not found in cluster (this may be expected if not yet deployed)"
    fi
done

echo ""
echo "✅ Quickstart validation completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - All prerequisites are installed and accessible"
echo "   - Minikube is running with Dapr installed"
echo "   - Project structure is intact"
echo "   - Helm chart is properly configured"
echo "   - Dapr components are available"
echo ""
echo "🚀 You're ready to follow the quickstart guide!"
echo "   The system is properly set up for the Advanced Cloud Deployment."