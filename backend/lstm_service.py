import numpy as np
import onnxruntime as ort
import os

ONNX_MODEL_PATH = os.path.join(os.path.dirname(__file__), "lstm_wellness_model.onnx")

# Load the ONNX session once at startup
_session = None

def get_session():
    global _session
    if _session is None:
        if not os.path.exists(ONNX_MODEL_PATH):
            raise FileNotFoundError(f"ONNX model not found at: {ONNX_MODEL_PATH}. Please follow the Colab conversion instructions.")
        _session = ort.InferenceSession(ONNX_MODEL_PATH, providers=["CPUExecutionProvider"])
    return _session

def get_model_input_info():
    """Returns input name and shape from the ONNX model."""
    session = get_session()
    inp = session.get_inputs()[0]
    return inp.name, inp.shape

def predict_with_lstm(metrics: dict) -> float:
    """
    Runs a single-timestep inference using the LSTM model.
    
    The LSTM expects a 3D input: (batch, timesteps, features)
    We use (1, 1, n_features) for a single real-time reading.
    """
    session = get_session()
    input_name, input_shape = get_model_input_info()
    
    # Extract features in the correct order expected by the LSTM
    # Adjust this list to match your Colab training feature order exactly!
    feature_order = [
        "TotalSteps",         
        "VeryActiveMinutes",
        "FairlyActiveMinutes",
        "LightlyActiveMinutes",
        "SedentaryMinutes",
        "Calories"
    ]
    
    # Build the raw feature vector
    raw_features = np.array([[metrics.get(f, 0.0) for f in feature_order]], dtype=np.float32)
    
    # Reshape to 3D: (1 batch, 1 timestep, n_features)
    lstm_input = raw_features.reshape(1, 1, raw_features.shape[1])
    
    # Run inference
    outputs = session.run(None, {input_name: lstm_input})
    
    # Get the scalar output and clip to [0, 100]
    raw_score = float(outputs[0].flatten()[0])
    score = float(np.clip(raw_score * 100, 0, 100))  # scale if model outputs 0-1
    
    return round(score, 1)
