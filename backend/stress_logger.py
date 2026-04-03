import csv
from datetime import datetime


def log_stress_event(blinks, ear, fatigue_score, stress_score):
    file_name = "stress_log.csv"

    with open(file_name, "a", newline="") as file:
        writer = csv.writer(file)

        writer.writerow(
            [
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                blinks,
                round(ear, 3),
                int(fatigue_score),
                int(stress_score),
            ]
        )
