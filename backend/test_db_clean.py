import pymongo
from pymongo import MongoClient
import certifi

uri = "mongodb+srv://piyushbhole37_db_user:g00BqxsW0XXpvyic@cluster0.1ghsmpz.mongodb.net/?appName=Cluster0"
try:
    print("Testing Atlas Clean...")
    client = MongoClient(uri, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    with open("result_clean.txt", "w") as f:
        f.write("SUCCESS")
    print("Connection Successful!")
except Exception as e:
    with open("result_clean.txt", "w") as f:
        f.write(str(e))
    print(f"Connection Failed: {e}")
