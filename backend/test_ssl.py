import pymongo
from pymongo import MongoClient

uri = "mongodb://cluster0-shard-00-00.1ghsmpz.mongodb.net:27017,cluster0-shard-00-01.1ghsmpz.mongodb.net:27017,cluster0-shard-00-02.1ghsmpz.mongodb.net:27017/chatbotDB?replicaSet=atlas-f2k5k6-shard-0&authSource=admin&retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"
try:
    print("Testing explicit nodes with tlsAllowInvalidCertificates=true...")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("SUCCESS")
except Exception as e:
    print("FAIL:", e)
