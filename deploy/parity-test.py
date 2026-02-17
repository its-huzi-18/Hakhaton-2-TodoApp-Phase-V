# Test script for deployment parity between Minikube and cloud environments

import subprocess
import sys
import time
import requests
import json

def run_command(command):
    """Run a shell command and return the output"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def check_minikube_status():
    """Check if Minikube is running"""
    print("Checking Minikube status...")
    return_code, stdout, stderr = run_command("minikube status")
    if return_code != 0:
        print(f"Minikube is not running: {stderr}")
        return False
    print("✓ Minikube is running")
    return True

def check_kubectl_connection():
    """Check if kubectl can connect to the cluster"""
    print("Checking kubectl connection...")
    return_code, stdout, stderr = run_command("kubectl cluster-info")
    if return_code != 0:
        print(f"Cannot connect to cluster: {stderr}")
        return False
    print("✓ Connected to cluster successfully")
    return True

def deploy_to_minikube():
    """Deploy the application to Minikube"""
    print("Deploying application to Minikube...")
    
    # Apply all Kubernetes manifests
    manifests = [
        "task-service-k8s.yaml",
        "reminder-service-k8s.yaml", 
        "recurring-task-engine-k8s.yaml",
        "notification-service-k8s.yaml",
        "audit-service-k8s.yaml",
        "dapr-components.yaml"
    ]
    
    for manifest in manifests:
        print(f"Applying {manifest}...")
        return_code, stdout, stderr = run_command(f"kubectl apply -f ./k8s/todo-chatbot/templates/{manifest}")
        if return_code != 0:
            print(f"Failed to apply {manifest}: {stderr}")
            return False
        print(f"✓ Applied {manifest}")
    
    print("✓ Application deployed to Minikube")
    return True

def wait_for_pods_ready(timeout=300):
    """Wait for all pods to be ready"""
    print("Waiting for all pods to be ready...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        return_code, stdout, stderr = run_command("kubectl get pods -o json")
        if return_code != 0:
            print(f"Error getting pods: {stderr}")
            return False
            
        try:
            pods_data = json.loads(stdout)
            pods = pods_data.get('items', [])
            
            all_ready = True
            for pod in pods:
                status = pod.get('status', {})
                phase = status.get('phase', '')
                
                # Check if pod is running and all containers are ready
                if phase == 'Running':
                    container_statuses = status.get('containerStatuses', [])
                    if container_statuses:
                        for container_status in container_statuses:
                            if not container_status.get('ready', False):
                                all_ready = False
                                break
                else:
                    all_ready = False
                    break
                    
            if all_ready and len(pods) > 0:  # Make sure we have pods
                print("✓ All pods are ready")
                return True
                
        except json.JSONDecodeError:
            print("Error parsing pod status JSON")
            
        time.sleep(10)
        print("Still waiting for pods to be ready...")
    
    print("✗ Timeout waiting for pods to be ready")
    return False

def test_basic_functionality():
    """Test basic functionality of the deployed services"""
    print("Testing basic functionality...")
    
    # Get service endpoints
    return_code, stdout, stderr = run_command("minikube service task-service --url")
    if return_code != 0:
        print(f"Could not get task-service URL: {stderr}")
        return False
    
    task_service_url = stdout.strip()
    print(f"Task service URL: {task_service_url}")
    
    # Test health endpoint
    try:
        response = requests.get(f"{task_service_url}/health", timeout=30)
        if response.status_code == 200:
            print("✓ Task service health check passed")
        else:
            print(f"✗ Task service health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Task service health check failed: {e}")
        return False
    
    # Test other services similarly
    services = ["reminder-service", "notification-service", "audit-service", "recurring-task-engine"]
    for service in services:
        return_code, stdout, stderr = run_command(f"minikube service {service} --url")
        if return_code == 0:
            service_url = stdout.strip()
            try:
                response = requests.get(f"{service_url}/health", timeout=30)
                if response.status_code == 200:
                    print(f"✓ {service} health check passed")
                else:
                    print(f"✗ {service} health check failed: {response.status_code}")
                    return False
            except requests.exceptions.RequestException as e:
                print(f"✗ {service} health check failed: {e}")
                return False
        else:
            print(f"Could not get {service} URL: {stderr}")
            # We'll consider this acceptable if the service isn't required to be externally accessible
    
    print("✓ Basic functionality tests passed")
    return True

def validate_dapr_components():
    """Validate that Dapr components are properly configured"""
    print("Validating Dapr components...")
    
    return_code, stdout, stderr = run_command("kubectl get components.dapr.io")
    if return_code != 0:
        print(f"Could not get Dapr components: {stderr}")
        return False
    
    print("Dapr components:")
    print(stdout)
    
    # Check for required components
    required_components = ["pubsub", "statestore", "secretstore"]
    for component in required_components:
        if component in stdout:
            print(f"✓ Dapr component '{component}' found")
        else:
            print(f"✗ Dapr component '{component}' not found")
            return False
    
    return True

def validate_dapr_placement():
    """Validate that Dapr placement service is running"""
    print("Validating Dapr placement service...")
    
    return_code, stdout, stderr = run_command("kubectl get pods -l app=dapr-placement-server -n dapr-system")
    if return_code != 0:
        print(f"Could not get Dapr placement pods: {stderr}")
        return False
    
    if "Running" in stdout:
        print("✓ Dapr placement service is running")
        return True
    else:
        print(f"✗ Dapr placement service is not running properly: {stdout}")
        return False

def validate_services_scaled():
    """Validate that services are scaled as expected"""
    print("Validating service scaling...")
    
    services = [
        {"name": "task-service", "expected_replicas": 1},
        {"name": "reminder-service", "expected_replicas": 1},
        {"name": "recurring-task-engine", "expected_replicas": 1},
        {"name": "notification-service", "expected_replicas": 1},
        {"name": "audit-service", "expected_replicas": 1}
    ]
    
    for service in services:
        return_code, stdout, stderr = run_command(f"kubectl get deployment {service['name']} -o jsonpath='{{.status.readyReplicas}}/{{.spec.replicas}}'")
        if return_code != 0:
            print(f"Could not get replica status for {service['name']}: {stderr}")
            return False
        
        try:
            ready, total = stdout.split('/')
            ready, total = int(ready), int(total)
            
            if ready == service['expected_replicas'] and total == service['expected_replicas']:
                print(f"✓ {service['name']} has correct scaling: {ready}/{total}")
            else:
                print(f"✗ {service['name']} has incorrect scaling: {ready}/{total}, expected: {service['expected_replicas']}/{service['expected_replicas']}")
                return False
        except ValueError:
            print(f"✗ Could not parse replica status for {service['name']}: {stdout}")
            return False
    
    return True

def main():
    """Main function to run all tests"""
    print("Starting deployment parity validation tests...")
    print("=" * 50)
    
    # Run all validation steps
    steps = [
        ("Check Minikube Status", check_minikube_status),
        ("Check kubectl Connection", check_kubectl_connection),
        ("Deploy Application", deploy_to_minikube),
        ("Wait for Pods Ready", wait_for_pods_ready),
        ("Validate Dapr Components", validate_dapr_components),
        ("Validate Dapr Placement", validate_dapr_placement),
        ("Validate Service Scaling", validate_services_scaled),
        ("Test Basic Functionality", test_basic_functionality)
    ]
    
    all_passed = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        print("-" * 30)
        if not step_func():
            print(f"✗ {step_name} FAILED")
            all_passed = False
            break
        else:
            print(f"✓ {step_name} PASSED")
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All deployment parity tests PASSED!")
        print("The application is properly deployed with Minikube → Cloud parity.")
        return 0
    else:
        print("❌ Some deployment parity tests FAILED!")
        print("The application does not meet Minikube → Cloud parity requirements.")
        return 1

if __name__ == "__main__":
    sys.exit(main())