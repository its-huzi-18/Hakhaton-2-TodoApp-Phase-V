#!/usr/bin/env python
"""
Startup script to ensure TensorFlow compatibility before importing other modules.
This script sets up the environment to handle tf.contrib.distributions deprecation.
"""

import sys
import os

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Import the compatibility module first to handle tf.contrib.distributions
try:
    import tf_contrib_compat
    print("Loaded TensorFlow compatibility module")
except ImportError as e:
    print(f"Could not load compatibility module: {e}")

# Now proceed with the normal application startup
if __name__ == "__main__":
    # Set the environment variable to use the compatibility mode
    os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
    
    # Import and run the main application
    from app.main import app
    import uvicorn
    
    uvicorn.run(app, host="0.0.0.0", port=8000)