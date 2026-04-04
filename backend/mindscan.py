"""
MindScan Voice AI Agent — Backend
===================================
Stack   : FastAPI + Groq (FREE LLaMA 3) + librosa (audio analysis)
Purpose : Conversational stress/fatigue assessment via VOICE input

FREE API: Get your free key at https://console.groq.com (no credit card)
"""

import os, uuid, json, io
from datetime import datetime
from lstm_service import predict_wellness, score_to_category

# ── MongoDB Atlas ─────────────────────────────────────────────────────────────
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL")

try:
    _mongo = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    _mongo.admin.command("ping")
    _db = _mongo["neurosense"]
    col_wellness  = _db["lstm_wellness"]      # LSTM predictions
    col_sessions  = _db["voice_sessions"]     # full MindScan reports
    col_answers   = _db["voice_answers"]      # per-question answers + acoustics
    MONGO_OK = True
    print("✅ MindScan: MongoDB Atlas connected")
except Exception as _e:
    print(f"❌ MindScan: MongoDB unavailable — {_e}")
    MONGO_OK = False
    col_wellness = col_sessions = col_answers = None


def _save(collection, doc: dict):
    """Insert a doc to MongoDB, silently skip if unavailable."""
    if not MONGO_OK or collection is None:
        return
    try:
        collection.insert_one(doc)
    except Exception as exc:
        print(f"⚠ MongoDB insert failed: {exc}")
import numpy as np
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

import librosa
import librosa.effects
import soundfile as sf

from pathlib import Path
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="MindScan Voice Agent", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

# ── In-memory session store ────────────────────────────────────────────────────
SESSIONS: dict = {}

# ── Questions ────────────────────────────────────────────────────────────────
QUESTIONS = [
    {"id": 1,  "domain": "Sleep Quality",     "text": "How has your sleep been lately? Tell me about how many hours you're getting and whether you wake up feeling rested."},
    {"id": 2,  "domain": "Energy & Fatigue",  "text": "How would you describe your energy levels throughout the day? Do you feel mentally or physically drained at certain points?"},
    {"id": 3,  "domain": "Concentration",     "text": "Have you been finding it hard to focus or stay on task recently? Can you describe what that's been like?"},
    {"id": 4,  "domain": "Emotional State",   "text": "How have you been feeling emotionally? Are you experiencing anxiety, irritability, or any emotional heaviness?"},
    {"id": 5,  "domain": "Physical Symptoms", "text": "Are you noticing any physical signs of stress — like headaches, muscle tension, changes in appetite, or stomach issues?"},
    {"id": 6,  "domain": "Work or Study Load","text": "How is your workload or academic pressure feeling right now — manageable, or starting to overwhelm you?"},
    {"id": 7,  "domain": "Social Withdrawal", "text": "Have you been pulling away from friends, family, or social situations more than usual? Tell me about that."},
    {"id": 8,  "domain": "Behavioral Changes","text": "Have you noticed changes in your habits — like eating differently, spending more time on screens, or struggling to start tasks?"},
    {"id": 9,  "domain": "Coping & Support",  "text": "When things feel hard, what do you typically do to cope? And do you feel you have people you can lean on?"},
    {"id": 10, "domain": "Overall Wellbeing", "text": "Finally, if you had to rate your overall wellbeing from one to ten right now, what would you say — and what's weighing on you most?"},
]

# ── System prompt for Claude ───────────────────────────────────────────────────
ANALYSIS_PROMPT = """
You are a clinical AI psychologist analysing a student's stress and fatigue from:
1. Their SPOKEN ANSWERS (transcribed text) — content, tone, language patterns
2. SPEECH ACOUSTIC PARAMETERS — pitch, energy, speech rate, pauses, voice quality

ACOUSTIC PARAMETER INTERPRETATION GUIDE:
- High pitch std (>40 Hz):         anxiety, emotional arousal
- Low pitch mean (<100 Hz):        fatigue, depression
- Low speech rate (<2.5 syl/sec):  fatigue, cognitive load
- High pause ratio (>0.4):         hesitation, cognitive overload
- Low RMS energy (<0.02):          fatigue, low motivation
- High jitter (>2%):               vocal stress, tension
- High shimmer (>5%):              vocal fatigue, strain
- Low spectral centroid (<1500Hz): vocal dullness, fatigue

Return ONLY valid JSON (no markdown):
{
  "stress_level": <0-100>,
  "fatigue_level": <0-100>,
  "stress_category": "<Low|Moderate|High|Severe>",
  "fatigue_category": "<Low|Moderate|High|Severe>",
  "domain_scores": {
    "Sleep": <0-100>, "Energy": <0-100>, "Concentration": <0-100>,
    "Emotional": <0-100>, "Physical": <0-100>, "WorkLoad": <0-100>,
    "Social": <0-100>, "Behavioral": <0-100>, "Coping": <0-100>, "Wellbeing": <0-100>
  },
  "speech_indicators": {
    "vocal_tension": <0-100>,
    "speech_fluency": <0-100>,
    "emotional_arousal": <0-100>,
    "vocal_fatigue": <0-100>,
    "cognitive_load": <0-100>
  },
  "key_acoustic_findings": ["finding1", "finding2", "finding3"],
  "language_signals": ["signal1", "signal2", "signal3"],
  "summary": "<3-4 sentence clinical summary>",
  "recommendations": ["rec1", "rec2", "rec3"]
}
"""

# ── Speech Analysis Engine ─────────────────────────────────────────────────────

def analyse_audio(audio_bytes: bytes, sr_target: int = 22050) -> dict:
    try:
        audio_io = io.BytesIO(audio_bytes)
        y, sr = librosa.load(audio_io, sr=sr_target, mono=True)

        if len(y) < sr * 0.3:
            return _empty_features("Audio too short")

        duration = librosa.get_duration(y=y, sr=sr)

        # Pitch
        f0, voiced_flag, _ = librosa.pyin(
            y, fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7'), sr=sr
        )
        f0_voiced   = f0[voiced_flag] if voiced_flag is not None else np.array([])
        pitch_mean  = float(np.nanmean(f0_voiced))  if len(f0_voiced) > 0 else 0.0
        pitch_std   = float(np.nanstd(f0_voiced))   if len(f0_voiced) > 0 else 0.0
        pitch_range = float(np.nanmax(f0_voiced) - np.nanmin(f0_voiced)) if len(f0_voiced) > 1 else 0.0

        # Energy
        rms      = librosa.feature.rms(y=y)[0]
        rms_mean = float(np.mean(rms))
        rms_std  = float(np.std(rms))

        # Silence/Pause
        intervals   = librosa.effects.split(y, top_db=25)
        speech_dur  = sum([(e - s) / sr for s, e in intervals]) if len(intervals) > 0 else duration
        silence_dur = duration - speech_dur
        pause_ratio = float(silence_dur / duration) if duration > 0 else 0.0
        num_pauses  = max(0, len(intervals) - 1)

        # Speech rate
        onset_env     = librosa.onset.onset_strength(y=y, sr=sr)
        onsets        = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
        syllable_count = len(onsets)
        speech_rate   = float(syllable_count / speech_dur) if speech_dur > 0 else 0.0

        # Jitter
        if len(f0_voiced) > 2:
            periods = 1.0 / (f0_voiced[f0_voiced > 0] + 1e-9)
            diffs   = np.abs(np.diff(periods))
            jitter  = float(np.mean(diffs) / (np.mean(periods) + 1e-9) * 100) if len(periods) > 1 else 0.0
        else:
            jitter = 0.0

        # Shimmer
        shimmer = float(np.mean(np.abs(np.diff(rms))) / (np.mean(rms) + 1e-9) * 100) if len(rms) > 2 else 0.0

        # Spectral
        centroid_mean  = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0]))
        rolloff_mean   = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)[0]))
        bandwidth_mean = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]))
        zcr_mean       = float(np.mean(librosa.feature.zero_crossing_rate(y)[0]))

        # MFCCs
        mfccs      = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_means = [round(float(np.mean(mfccs[i])), 3) for i in range(13)]

        return {
            "duration_sec":          round(duration, 2),
            "speech_dur_sec":        round(speech_dur, 2),
            "silence_dur_sec":       round(silence_dur, 2),
            "pause_ratio":           round(pause_ratio, 3),
            "num_pauses":            num_pauses,
            "speech_rate_syl_sec":   round(speech_rate, 2),
            "pitch_mean_hz":         round(pitch_mean, 2),
            "pitch_std_hz":          round(pitch_std, 2),
            "pitch_range_hz":        round(pitch_range, 2),
            "rms_energy_mean":       round(rms_mean, 5),
            "rms_energy_std":        round(rms_std, 5),
            "jitter_pct":            round(jitter, 3),
            "shimmer_pct":           round(shimmer, 3),
            "spectral_centroid_hz":  round(centroid_mean, 2),
            "spectral_rolloff_hz":   round(rolloff_mean, 2),
            "spectral_bandwidth_hz": round(bandwidth_mean, 2),
            "zcr_mean":              round(zcr_mean, 5),
            "syllable_count":        syllable_count,
            "mfcc_means":            mfcc_means,
            "error":                 None,
        }
    except Exception as e:
        return _empty_features(str(e))


def _empty_features(reason: str) -> dict:
    return {
        "duration_sec": 0, "speech_dur_sec": 0, "silence_dur_sec": 0,
        "pause_ratio": 0, "num_pauses": 0, "speech_rate_syl_sec": 0,
        "pitch_mean_hz": 0, "pitch_std_hz": 0, "pitch_range_hz": 0,
        "rms_energy_mean": 0, "rms_energy_std": 0,
        "jitter_pct": 0, "shimmer_pct": 0,
        "spectral_centroid_hz": 0, "spectral_rolloff_hz": 0,
        "spectral_bandwidth_hz": 0, "zcr_mean": 0,
        "syllable_count": 0, "mfcc_means": [0] * 13,
        "error": reason,
    }


def compute_quick_stress_score(features: dict) -> dict:
    jitter_score    = min(100, features["jitter_pct"] * 10)
    shimmer_score   = min(100, features["shimmer_pct"] * 5)
    pitch_std_score = min(100, features["pitch_std_hz"] / 60 * 100)
    vocal_tension   = round((jitter_score + shimmer_score + pitch_std_score) / 3)

    energy_fatigue = max(0, 100 - min(100, features["rms_energy_mean"] / 0.05 * 100))
    pitch_fatigue  = max(0, 100 - min(100, (features["pitch_mean_hz"] - 70) / 130 * 100)) \
                     if features["pitch_mean_hz"] > 0 else 50
    rate_fatigue   = max(0, 100 - min(100, features["speech_rate_syl_sec"] / 5 * 100))
    vocal_fatigue  = round((energy_fatigue + pitch_fatigue + rate_fatigue) / 3)

    pitch_arousal    = min(100, max(0, (features["pitch_mean_hz"] - 100) / 150 * 100)) \
                       if features["pitch_mean_hz"] > 0 else 30
    range_arousal    = min(100, features["pitch_range_hz"] / 300 * 100)
    energy_arousal   = min(100, features["rms_energy_mean"] / 0.06 * 100)
    emotional_arousal = round((pitch_arousal + range_arousal + energy_arousal) / 3)

    pause_load    = min(100, features["pause_ratio"] * 200)
    rate_load     = max(0, 100 - min(100, features["speech_rate_syl_sec"] / 4 * 100))
    centroid_load = max(0, 100 - min(100, features["spectral_centroid_hz"] / 2500 * 100))
    cognitive_load = round((pause_load + rate_load + centroid_load) / 3)

    speech_fluency = max(0, 100 - round((pause_load + jitter_score) / 2))

    return {
        "vocal_tension":    vocal_tension,
        "vocal_fatigue":    vocal_fatigue,
        "emotional_arousal": emotional_arousal,
        "cognitive_load":   cognitive_load,
        "speech_fluency":   speech_fluency,
    }


def call_claude_analysis(answers: list) -> dict:
    payload = []
    for i, ans in enumerate(answers):
        q     = QUESTIONS[i]
        feats = ans.get("acoustic_features", {})
        quick = ans.get("quick_scores", {})
        payload.append({
            "question_number":    i + 1,
            "domain":             q["domain"],
            "question":           q["text"],
            "transcribed_answer": ans.get("transcript", ""),
            "acoustic_features": {
                "duration_sec":        feats.get("duration_sec"),
                "pause_ratio":         feats.get("pause_ratio"),
                "speech_rate_syl_sec": feats.get("speech_rate_syl_sec"),
                "pitch_mean_hz":       feats.get("pitch_mean_hz"),
                "pitch_std_hz":        feats.get("pitch_std_hz"),
                "pitch_range_hz":      feats.get("pitch_range_hz"),
                "rms_energy_mean":     feats.get("rms_energy_mean"),
                "jitter_pct":          feats.get("jitter_pct"),
                "shimmer_pct":         feats.get("shimmer_pct"),
                "spectral_centroid_hz":feats.get("spectral_centroid_hz"),
                "num_pauses":          feats.get("num_pauses"),
            },
            "quick_acoustic_scores": quick,
        })

    prompt = f"""
Analyse the following 10 voice-recorded answers from a student wellbeing assessment.
Each answer includes the transcribed text, acoustic speech parameters, and quick scores.

Data:
{json.dumps(payload, indent=2)}

Integrate both linguistic content AND acoustic speech parameters in your analysis.
Return ONLY valid JSON as described in your instructions.
""".strip()

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # FREE — Groq's best model
            max_tokens=1500,
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ANALYSIS_PROMPT},
                {"role": "user",   "content": prompt},
            ],
        )
        raw = response.choices[0].message.content.strip()
        return json.loads(raw.replace("```json", "").replace("```", "").strip())
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e


# ── Request models ─────────────────────────────────────────────────────────────
class StartRequest(BaseModel):
    user_id: Optional[str] = None


class WellnessRequest(BaseModel):
    TotalSteps:          float = 0.0
    VeryActiveMinutes:   float = 0.0
    FairlyActiveMinutes: float = 0.0
    Calories:            float = 0.0


# ── LSTM Wellness endpoint ────────────────────────────────────────────────────

@app.post("/wellness/predict")
def wellness_predict(body: WellnessRequest):
    """
    Run the trained LSTM wellness model and persist every prediction to MongoDB.
    Returns a wellness_score in [0, 100] and a category label.
    """
    metrics  = body.dict()
    score    = predict_wellness(metrics)
    category = score_to_category(score)

    # ── Persist to MongoDB ────────────────────────────────────────────────────
    _save(col_wellness, {
        "timestamp":         datetime.utcnow(),
        "source":            "LSTM Model",
        "input_metrics":     metrics,
        "wellness_score":    score,
        "wellness_category": category,
    })

    return {
        "wellness_score":    score,
        "wellness_category": category,
        "input_metrics":     metrics,
        "mongodb_saved":     MONGO_OK,
    }





# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0", "service": "MindScan Voice Agent"}


@app.get("/questions")
def get_questions():
    return {"questions": QUESTIONS, "total": len(QUESTIONS)}


@app.post("/session/start")
def start_session(body: StartRequest):
    sid = str(uuid.uuid4())
    SESSIONS[sid] = {
        "session_id":  sid,
        "user_id":     body.user_id,
        "status":      "active",
        "current_q":   0,
        "answers":     [],
        "report":      None,
        "created_at":  datetime.utcnow().isoformat(),
    }
    return {
        "session_id":      sid,
        "first_question":  QUESTIONS[0],
        "total_questions": len(QUESTIONS),
        "status":          "active",
    }


@app.post("/session/answer")
async def submit_answer(
    session_id:     str        = Form(...),
    question_index: int        = Form(...),
    transcript:     str        = Form(""),
    audio:          UploadFile = File(...),
):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found. Call /session/start first.")
    if session["status"] == "complete":
        raise HTTPException(400, "Session already complete.")

    audio_bytes  = await audio.read()
    features     = analyse_audio(audio_bytes)
    quick_scores = compute_quick_stress_score(features)

    session["answers"].append({
        "question_index":    question_index,
        "transcript":        transcript,
        "acoustic_features": features,
        "quick_scores":      quick_scores,
    })
    session["current_q"] = question_index + 1

    # ── Save every answer to MongoDB immediately ──────────────────────────────────
    _save(col_answers, {
        "timestamp":         datetime.utcnow(),
        "session_id":        session_id,
        "user_id":           session.get("user_id"),
        "question_index":    question_index,
        "domain":            QUESTIONS[question_index]["domain"],
        "question":          QUESTIONS[question_index]["text"],
        "transcript":        transcript,
        "acoustic_features": features,
        "quick_scores":      quick_scores,
    })

    if question_index >= len(QUESTIONS) - 1:
        try:
            report = call_claude_analysis(session["answers"])
        except Exception as e:
            print("ERROR IN SUBMIT ANSWER:", repr(e))
            import traceback
            traceback.print_exc()
            raise HTTPException(500, f"Claude analysis failed: {str(e)}")

        session["status"] = "complete"
        session["report"] = report

        # ── Save complete session + report to MongoDB ──────────────────────────────
        _save(col_sessions, {
            "timestamp":    datetime.utcnow(),
            "session_id":   session_id,
            "user_id":      session.get("user_id"),
            "created_at":   session.get("created_at"),
            "completed_at": datetime.utcnow().isoformat(),
            "total_questions": len(QUESTIONS),
            "stress_level":    report.get("stress_level"),
            "fatigue_level":   report.get("fatigue_level"),
            "stress_category": report.get("stress_category"),
            "fatigue_category":report.get("fatigue_category"),
            "domain_scores":   report.get("domain_scores"),
            "speech_indicators": report.get("speech_indicators"),
            "key_acoustic_findings": report.get("key_acoustic_findings"),
            "language_signals":  report.get("language_signals"),
            "summary":         report.get("summary"),
            "recommendations": report.get("recommendations"),
            "full_report":     report,
        })
        print(f"📦 MindScan session {session_id[:8]}... saved to MongoDB")

        return {
            "session_id":        session_id,
            "question_index":    question_index,
            "acoustic_features": features,
            "quick_scores":      quick_scores,
            "next_question":     None,
            "status":            "complete",
            "report":            report,
        }

    return {
        "session_id":        session_id,
        "question_index":    question_index,
        "acoustic_features": features,
        "quick_scores":      quick_scores,
        "next_question":     QUESTIONS[question_index + 1],
        "status":            "active",
        "report":            None,
    }


@app.get("/session/{session_id}")
def get_session(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    return session


@app.post("/analyse/audio")
async def analyse_audio_only(audio: UploadFile = File(...)):
    """Standalone endpoint to test acoustic analysis on any audio file."""
    audio_bytes  = await audio.read()
    features     = analyse_audio(audio_bytes)
    quick_scores = compute_quick_stress_score(features)
    return {"acoustic_features": features, "quick_scores": quick_scores}
