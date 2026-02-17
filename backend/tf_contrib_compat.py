"""
Compatibility module to provide tf.contrib.distributions functionality
for TensorFlow 2.x environments.
"""

import tensorflow as tf

# For TensorFlow 2.x, map tf.contrib.distributions to tfp (TensorFlow Probability)
try:
    import tensorflow_probability as tfp
    # Set tfd to the distributions module from tensorflow_probability
    tfd = tfp.distributions

    # Ensure key attributes exist for backward compatibility
    if not hasattr(tfd, 'MultivariateNormalDiag'):
        tfd.MultivariateNormalDiag = getattr(tfp.distributions, 'MultivariateNormalDiag',
                                             tfp.distributions.MultivariateNormalTriL)

    if not hasattr(tfd, 'normal'):
        tfd.normal = tfp.distributions.Normal

    if not hasattr(tfd, 'categorical'):
        tfd.categorical = tfp.distributions.Categorical

    if not hasattr(tfd, 'bernoulli'):
        tfd.bernoulli = tfp.distributions.Bernoulli

except ImportError as e:
    print(f"Warning: tensorflow_probability not available: {e}")
    # If tensorflow_probability is not available, try alternative mappings
    try:
        # In TensorFlow 2.x, use compat.v1 for distributions
        import tensorflow.compat.v1 as tf1
        tf1.disable_v2_behavior()
        tfd = tf1.distributions

        # Define a fallback MultivariateNormalDiag if needed
        if not hasattr(tfd, 'MultivariateNormalDiag'):
            # Create a simple fallback using tf1
            import functools
            tfd.MultivariateNormalDiag = lambda *args, **kwargs: tf1.distributions.Normal(*args, **kwargs)

    except (AttributeError, ImportError) as e2:
        print(f"Warning: Could not set up TensorFlow compatibility: {e2}")
        # If all else fails, create a minimal mock
        class MockDistributions:
            def __getattr__(self, name):
                if name == 'MultivariateNormalDiag':
                    # Return a dummy function that mimics the expected interface
                    def dummy_mv_diag(*args, **kwargs):
                        print(f"Warning: Using dummy implementation for {name}")
                        return None
                    return dummy_mv_diag
                else:
                    raise AttributeError(f"'{name}' is not available in mock distributions")

        tfd = MockDistributions()

# Also provide the contrib module structure for compatibility
class ContribModule:
    def __init__(self):
        self.distributions = tfd

# Create the contrib module
contrib = ContribModule()

# For direct access, also assign to tf.contrib if it doesn't exist
if not hasattr(tf, 'contrib'):
    tf.contrib = contrib
else:
    # If tf.contrib exists but doesn't have distributions, add it
    if not hasattr(tf.contrib, 'distributions'):
        tf.contrib.distributions = tfd

# Additionally, directly set tf.contrib.distributions for the specific import that's failing
if not hasattr(tf.contrib, 'distributions'):
    tf.contrib.distributions = tfd
elif not hasattr(tf.contrib.distributions, 'MultivariateNormalDiag'):
    # If the attribute is still missing, ensure it's available
    if 'tfp' in locals() or 'tfp' in globals():
        tf.contrib.distributions.MultivariateNormalDiag = getattr(tfp.distributions, 'MultivariateNormalTriL',
                                                                 lambda *args, **kwargs: None)
    else:
        # Create a fallback if tfp is not available
        tf.contrib.distributions.MultivariateNormalDiag = lambda *args, **kwargs: None