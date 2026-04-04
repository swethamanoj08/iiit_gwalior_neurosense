import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

# Load dataset
df = pd.read_csv("wearable_dataset.csv")

# ---------------- FEATURE ENGINEERING ---------------- #
df["activity_level"] = df["steps"] / (df["heart_rate"] + 1)
df["is_night"] = df["hour"].apply(lambda x: 1 if x < 6 or x > 22 else 0)

# ---------------- TARGET CREATION ---------------- #

# Stress
def stress_label(row):
    if row["heart_rate"] > 100 and row["steps"] < 300:
        return "High"
    elif row["heart_rate"] > 85:
        return "Medium"
    return "Low"

df["stress"] = df.apply(stress_label, axis=1)

# Health Score
df["health_score"] = (
    0.4 * df["sleep_quality"] * 100 +
    0.3 * (df["steps"] > 800).astype(int) * 100 +
    0.3 * ((df["heart_rate"].between(70,100)).astype(int) * 100)
)

# Anomaly
df["anomaly"] = df.apply(
    lambda x: 1 if x["heart_rate"] > 120 or x["heart_rate"] < 45 or x["steps"] > 2000 else 0,
    axis=1
)

# ---------------- FEATURES ---------------- #
features = ["steps", "heart_rate", "sleep_state", "sleep_quality", "hour", "activity_level", "is_night"]
X = df[features]

# ---------------- STRESS MODEL ---------------- #
le = LabelEncoder()
y_stress = le.fit_transform(df["stress"])

X_train, X_test, y_train, y_test = train_test_split(X, y_stress, test_size=0.2, random_state=42)

stress_model = RandomForestClassifier(n_estimators=100)
stress_model.fit(X_train, y_train)

print("Stress Model Accuracy:", stress_model.score(X_test, y_test))

# ---------------- HEALTH MODEL ---------------- #
y_health = df["health_score"]

X_train, X_test, y_train, y_test = train_test_split(X, y_health, test_size=0.2, random_state=42)

health_model = RandomForestRegressor(n_estimators=100)
health_model.fit(X_train, y_train)

print("Health Model Score:", health_model.score(X_test, y_test))

# ---------------- ANOMALY MODEL ---------------- #
y_anomaly = df["anomaly"]

X_train, X_test, y_train, y_test = train_test_split(X, y_anomaly, test_size=0.2, random_state=42)

anomaly_model = RandomForestClassifier(n_estimators=100)
anomaly_model.fit(X_train, y_train)

print("Anomaly Model Accuracy:", anomaly_model.score(X_test, y_test))

# ---------------- SAVE MODELS ---------------- #
joblib.dump(stress_model, "stress_model.pkl")
joblib.dump(health_model, "health_model.pkl")
joblib.dump(anomaly_model, "anomaly_model.pkl")

print("✅ All models trained and saved!")