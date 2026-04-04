import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import os
import time

def train_wellness_model():
    print("Loading Fitbit dataset...")
    # Path to the dataset
    data_path = r"c:\Users\Asus\Desktop\iiit gwalior finals\mturkfitbit_export_3.12.16-4.11.16\Fitabase Data 3.12.16-4.11.16\dailyActivity_merged.csv"
    
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}")
        return
        
    df = pd.read_csv(data_path)
    
    # Selecting the features that dictate physical wellness
    features = ['TotalSteps', 'VeryActiveMinutes', 'FairlyActiveMinutes', 'LightlyActiveMinutes', 'SedentaryMinutes', 'Calories']
    X = df[features].copy()
    
    print("Generating synthetic Wellness Target...")
    # Generate a synthetic "Wellness Score" (0-100) since raw Fitbit data doesn't explicitly have a "Stress" column
    # Higher activity and calories + lower sedentary minutes = Better score
    base_score = 50
    step_bonus = (X['TotalSteps'] / 10000) * 15  # Up to +15 for 10k steps
    active_bonus = (X['VeryActiveMinutes'] / 30) * 15 # Up to +15 for 30 min of very active
    sedentary_penalty = (X['SedentaryMinutes'] / 1440) * 20 # Up to -20 for sitting all day
    
    # Calculate score & add realistic noise
    noise = np.random.normal(0, 5, size=len(df))
    y = base_score + step_bonus + active_bonus - sedentary_penalty + noise
    y = np.clip(y, 10, 100) # Ensure it stays within reasonable bounds
    
    # Split the dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForest model... (Doing it fast!)")
    start_time = time.time()
    # Using RandomForest with moderate estimators for blazing fast speed
    model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    train_time = time.time() - start_time
    print(f"Model trained in {train_time:.2f} seconds.")
    
    # Evaluate
    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    mae = mean_absolute_error(y_test, preds)
    print(f"Testing Performance -> RMSE: {rmse:.2f}, MAE: {mae:.2f}")
    
    # Save Model
    os.makedirs("backend", exist_ok=True)
    model_path = os.path.join("backend", "wellness_model.pkl")
    joblib.dump(model, model_path)
    print(f"Model successfully saved to: {model_path}")

if __name__ == "__main__":
    train_wellness_model()
