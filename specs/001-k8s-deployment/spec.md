# Phase IV: Deploy Todo Chatbot on Kubernetes with AI-assisted DevOps tools

## Phase Objective

The objective of this phase is to deploy the Phase III Todo Chatbot application locally on Kubernetes using Minikube. This deployment will leverage AI-assisted DevOps tools to containerize, orchestrate, and manage the application lifecycle. The deployment should enable local prototyping and learning of Kubernetes concepts while maintaining the functionality of the existing Todo Chatbot application.

Key requirements:
- Deploy the existing Todo Chatbot (frontend + backend microservices) on Minikube
- Use Docker for containerization with AI assistance from Gordon
- Implement Helm Charts for package management
- Leverage AI Kubernetes tools (kubectl-ai, Kagent) for cluster management
- Support optional local database (JSON or SQLite)
- Enable local development and testing capabilities

## Technology Stack

| Component | Tool | Responsibility |
|-----------|------|----------------|
| Frontend | React / Next.js | User interface and client-side logic |
| Backend | Python FastAPI | API endpoints and business logic |
| Database | JSON / SQLite | Data persistence (optional/local) |
| Containerization | Docker Desktop | Container packaging and runtime |
| AI Assistant | Gordon | Dockerfile generation and optimization |
| Orchestration | Minikube | Local Kubernetes cluster |
| Package Management | Helm Charts | Application packaging and deployment |
| AI Kubernetes Tools | kubectl-ai, Kagent | Cluster management and automation |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Minikube Cluster                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Frontend      │  │   Backend       │  │   Database  │ │
│  │   Pod           │  │   Pod           │  │   Pod       │ │
│  │                 │  │                 │  │             │ │
│  │  React/Next.js  │  │  Python         │  │  JSON/      │ │
│  │  Service        │  │  FastAPI       │  │  SQLite     │ │
│  │  Ingress        │  │  Service       │  │  Service    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│              │                │                  │         │
│              └────────────────┼──────────────────┘         │
│                               │                            │
│                    ┌─────────────────────────────────┐     │
│                    │        Load Balancer          │     │
│                    │        Service                │     │
│                    └─────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## AI Agent Responsibilities

### Gordon (AI Docker Assistant)
- Generate optimized Dockerfiles for both frontend and backend services
- Create multi-stage builds to minimize image sizes
- Handle dependency management for different environments
- Example command: `gordon create-dockerfile --service frontend --tech react`

### kubectl-ai (AI-enhanced kubectl)
- Generate Kubernetes manifests (Deployments, Services, ConfigMaps)
- Apply configurations with intelligent suggestions
- Monitor and troubleshoot deployments
- Example command: `kubectl-ai create deployment frontend --image todo-frontend:latest`

### Kagent (AI Kubernetes Agent)
- Automate Helm chart creation and customization
- Manage application lifecycle operations
- Perform health checks and automated scaling
- Example command: `kagent deploy --chart todo-chatbot --namespace default`

## Helm Chart Structure

```
todo-chatbot/
├── Chart.yaml
├── values.yaml
├── charts/
├── templates/
│   ├── NOTES.txt
│   ├── _helpers.tpl
│   ├── deployment-frontend.yaml
│   ├── deployment-backend.yaml
│   ├── service-frontend.yaml
│   ├── service-backend.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── pvc.yaml (optional)
└── README.md
```

### Example values.yaml

```yaml
# Default values for todo-chatbot
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

replicaCount: 1

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

frontend:
  image:
    repository: todo-frontend
    pullPolicy: IfNotPresent
    tag: "latest"
  service:
    type: ClusterIP
    port: 3000
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: todo.local
        paths:
          - path: /
            pathType: Prefix

backend:
  image:
    repository: todo-backend
    pullPolicy: IfNotPresent
    tag: "latest"
  service:
    type: ClusterIP
    port: 8000
  env:
    DATABASE_URL: "sqlite:///./todo.db"

database:
  enabled: true
  type: sqlite
  storage:
    enabled: true
    size: 1Gi

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity: {}
```

## Step-by-Step Deployment Workflow

### Prerequisites
1. Install Docker Desktop
2. Install Minikube
3. Install kubectl
4. Install Helm
5. Install AI tools (Gordon, kubectl-ai, Kagent)

### Phase Steps

#### Step 1: Environment Setup
1. Start Minikube cluster:
   ```
   minikube start
   ```
2. Verify cluster status:
   ```
   kubectl cluster-info
   ```

#### Step 2: Containerization with Gordon
1. Generate Dockerfile for frontend:
   ```
   gordon create-dockerfile --service frontend --tech react --output ./frontend/Dockerfile
   ```
2. Generate Dockerfile for backend:
   ```
   gordon create-dockerfile --service backend --tech fastapi --output ./backend/Dockerfile
   ```
3. Build and push images to Minikube registry:
   ```
   eval $(minikube docker-env)
   docker build -t todo-frontend:latest ./frontend
   docker build -t todo-backend:latest ./backend
   ```

#### Step 3: Helm Chart Preparation
1. Use Kagent to generate Helm chart:
   ```
   kagent generate chart --name todo-chatbot --output ./charts
   ```
2. Customize values.yaml with appropriate configurations

#### Step 4: Deployment
1. Install the Helm chart:
   ```
   helm install todo-chatbot ./charts/todo-chatbot --values ./charts/todo-chatbot/values.yaml
   ```
2. Verify deployment:
   ```
   kubectl get pods
   kubectl get services
   ```

#### Step 5: Configuration and Testing
1. Expose the application:
   ```
   minikube service todo-frontend-service --url
   ```
2. Test the deployed application
3. Configure ingress if needed:
   ```
   minikube addons enable ingress
   ```

#### Step 6: Monitoring and Management
1. Use kubectl-ai for monitoring:
   ```
   kubectl-ai monitor deployment todo-frontend
   ```
2. Scale resources as needed:
   ```
   kubectl scale deployment todo-frontend --replicas=2
   ```

## Spec Notes / Governance

### Minikube Limitations
- Resource constraints compared to production clusters
- Limited networking capabilities
- Single-node cluster (no high availability)
- May require increased memory allocation for complex applications

### Optional Database Considerations
- SQLite is suitable for local development but not production
- JSON storage is ephemeral and not recommended for persistent data
- For production deployments, consider PostgreSQL or MySQL

### Security Considerations
- Images should be scanned for vulnerabilities
- Network policies should be implemented to restrict traffic
- Secrets should be managed securely using Kubernetes secrets

### Performance Optimization
- Resource limits should be set appropriately to prevent resource contention
- Horizontal Pod Autoscaler can be configured for dynamic scaling
- Image optimization is critical for faster deployments

## Summary / Conclusion

This Phase IV specification outlines the deployment of the Todo Chatbot application on a local Kubernetes cluster using Minikube. The approach leverages AI-assisted DevOps tools to simplify the containerization, orchestration, and management of the application.

The deployment workflow enables local prototyping and learning of Kubernetes concepts while maintaining the functionality of the existing Todo Chatbot application. The use of Helm Charts ensures consistent and reproducible deployments, while AI tools like Gordon, kubectl-ai, and Kagent automate many routine DevOps tasks.

This specification provides a foundation for local development and testing, with considerations for scaling to production environments in future phases. The modular architecture allows for easy updates and maintenance of individual components while maintaining the overall system integrity.