import csv
from datetime import datetime
import os

FILE_NAME = "stress_log.csv"

def log_stress_event(blinks, ear, fatigue_score, stress_score):

    file_exists = os.path.isfile(FILE_NAME)

    with open(FILE_NAME, "a", newline="") as file:

        writer = csv.writer(file)

        if not file_exists:
            writer.writerow([
                "time",
                "blink_count",
                "ear",
                "fatigue_score",
                "stress_score"
            ])

        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            blinks,
            round(ear,3),
            int(fatigue_score),
            int(stress_score)
        ])