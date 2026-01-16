import pandas as pd

# Load dataset
df = pd.read_csv("../../dataset/student_performance.csv")

# Display basic info
print("Dataset Shape:", df.shape)
print("\nColumns:\n", df.columns)
print("\nFirst 5 Rows:\n", df.head())

# Check missing values
print("\nMissing Values:\n", df.isnull().sum())
