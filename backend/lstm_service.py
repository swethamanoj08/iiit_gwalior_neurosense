"""
LSTM Wellness Model Service
============================
Uses lstm_wellness_model.onnx via onnxruntime.

Actual model signature (inspected):
  Input  : ('input_layer', shape=[batch, 24, 4], float32)
  Output : ('output_0',    shape=[batch, 1],     float32)

The model was trained on 24-timestep sequences of 4 features.
For real-time single-reading inference we tile the current reading
across all 24 timesteps — this matches the training padding strategy.
"""

import os
import numpy as np
import onnxruntime as ort

ONNX_MODEL_PATH = os.path.join(os.path.dirname(__file__), "lstm_wellness_model.onnx")

# ── Model constants (from inspection) ────────────────────────────────────────
TIMESTEPS = 24
N_FEATURES = 4

# Feature order MUST match training — 4 features
FEATURE_ORDER = [
    "TotalSteps",
    "VeryActiveMinutes",
    "FairlyActiveMinutes",
    "Calories",
]

# Lazy singleton
_session = None


def get_session() -> ort.InferenceSession:
    global _session
    if _session is None:
        if not os.path.exists(ONNX_MODEL_PATH):
            raise FileNotFoundError(f"ONNX model not found: {ONNX_MODEL_PATH}")
        _session = ort.InferenceSession(
            ONNX_MODEL_PATH, providers=["CPUExecutionProvider"]
        )
        inp = _session.get_inputs()[0]
        print(f"[LSTM] ✅ Model loaded  input={inp.name}  shape={inp.shape}")
    return _session


def predict_wellness(metrics: dict) -> float:
    """
    Run the trained LSTM wellness model.

    Parameters
    ----------
    metrics : dict
        Must contain keys from FEATURE_ORDER. Missing keys → 0.0.

    Returns
    -------
    float
        Wellness score in [0, 100].
    """
    session = get_session()
    input_name = session.get_inputs()[0].name

    # Build a single feature row  (4 values)
    row = np.array(
        [float(metrics.get(f, 0.0)) for f in FEATURE_ORDER],
        dtype=np.float32,
    )

    # Tile across 24 timesteps → shape (1, 24, 4)
    lstm_input = np.tile(row, (1, TIMESTEPS, 1)).reshape(1, TIMESTEPS, N_FEATURES)

    # Run inference
    outputs = session.run(None, {input_name: lstm_input})
    raw_score = float(outputs[0].flatten()[0])

    # Scale to [0, 100] if model outputs probability (0–1)
    if raw_score <= 1.0:
        raw_score *= 100.0

    return round(float(np.clip(raw_score, 0, 100)), 1)


def score_to_category(score: float) -> str:
    if score >= 80:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Fair"
    elif score >= 20:
        return "Poor"
    return "Critical"


# Backward-compatible alias
def predict_with_lstm(metrics: dict) -> float:
    return predict_wellness(metrics)
