import pandas as pd
import matplotlib.pyplot as plt

data = pd.read_csv("stress_log.csv", names=["time","stress"])

counts = data["stress"].value_counts()

plt.bar(counts.index, counts.values)

plt.title("Stress Detection Summary")
plt.xlabel("Stress Level")
plt.ylabel("Count")

plt.show()