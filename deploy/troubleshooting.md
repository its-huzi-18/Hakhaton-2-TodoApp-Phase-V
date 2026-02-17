# Troubleshooting Guide for Todo Chatbot Kubernetes Deployment

## Common Issues and Solutions

### 1. Minikube Startup Issues

**Problem**: Minikube fails to start with memory allocation errors
```
X Exiting due to RSRC_OVER_ALLOC_MEM: Requested memory allocation 8192MB is more than your system limit 8071MB.
```

**Solution**: Start Minikube with lower memory allocation:
```bash
minikube delete
minikube start --driver=docker --cpus=2 --memory=2048 --disk-size=8g
```

### 2. Docker Environment Issues on Windows

**Problem**: Unable to set Docker environment to use Minikube's Docker daemon
```
SET DOCKER_TLS_VERIFY=1
SET DOCKER_HOST=tcp://127.0.0.1:60230
SET DOCKER_CERT_PATH=C:\Users\srt\.minikube\certs
SET MINIKUBE_ACTIVE_DOCKERD=minikube
```

**Solution**: Use the following command to set the environment in PowerShell:
```powershell
& minikube -p minikube docker-env | Invoke-Expression
```

Or in Command Prompt:
```cmd
FOR /f "tokens=*" %i IN ('minikube -p minikube docker-env --shell cmd') DO @%i
```

### 3. Docker Build Timeouts

**Problem**: Docker builds timing out due to large context size
```
#5 [internal] load build context
#5 transferring context: 96.14MB 80.8s
```

**Solution**: 
1. Use `.dockerignore` to exclude unnecessary files
2. Build with `--no-cache` flag to avoid layer caching issues
3. Consider using multi-stage builds to reduce final image size

### 4. Ingress Controller Not Responding

**Problem**: Ingress resources not accessible after deployment

**Solution**: 
1. Ensure ingress addon is enabled: `minikube addons enable ingress`
2. Run `minikube tunnel` in a separate terminal to expose LoadBalancer services
3. Check ingress status: `kubectl get ingress`

### 5. ImagePullBackOff Error

**Problem**: Pods stuck in `ImagePullBackOff` status

**Solution**: 
1. Ensure Docker images are built in Minikube's environment: `eval $(minikube docker-env)`
2. Verify image exists: `docker images | grep todo-`
3. Use `imagePullPolicy: Never` or `imagePullPolicy: IfNotPresent` in deployments

### 6. Service Unavailability

**Problem**: Services not accessible from outside Minikube

**Solution**:
1. Use `minikube service <service-name>` to get the correct URL
2. For LoadBalancer services, run `minikube tunnel` in a separate terminal
3. Verify service type and port configuration

### 7. AI Tool Availability

**Problem**: Gordon, kubectl-ai, or Kagent tools not available

**Solution**: 
1. These are proprietary AI tools that need separate installation
2. Use standard Docker, kubectl, and Helm commands as alternatives
3. Follow manual configuration procedures when AI assistance is not available

## Deployment Verification Steps

1. **Check Minikube status**:
   ```bash
   minikube status
   ```

2. **Verify cluster connectivity**:
   ```bash
   kubectl cluster-info
   ```

3. **Check all pods**:
   ```bash
   kubectl get pods --all-namespaces
   ```

4. **Check all services**:
   ```bash
   kubectl get services --all-namespaces
   ```

5. **Check ingress**:
   ```bash
   kubectl get ingress
   ```

6. **Check Helm releases**:
   ```bash
   helm list
   ```

## Performance Considerations

- Minikube runs as a single-node cluster, so resource constraints apply
- Use smaller images when possible to reduce deployment time
- Consider using `--memory=2048` or higher based on system capabilities
- For development, use `--image-pull-policy=Never` to avoid pulling images repeatedly

## Cleanup Procedures

To clean up the deployment:
```bash
helm uninstall todo-chatbot
minikube stop
minikube delete
```

To reset the environment completely:
```bash
minikube delete
docker system prune -a  # Removes unused images, containers, etc.
```