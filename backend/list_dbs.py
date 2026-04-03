import certifi
import urllib.parse
from pymongo import MongoClient
import ssl

orig_create_default_context = ssl.create_default_context
def create_unverified_context(*args, **kwargs):
    ctx = orig_create_default_context(*args, **kwargs)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

ssl.create_default_context = create_unverified_context

password = urllib.parse.quote_plus("g00BqxsW0XXpvyic")
DATABASE_URL = f"mongodb+srv://piyushbhole37_db_user:{password}@cluster0.1ghsmpz.mongodb.net/?appName=Cluster0"

try:
    client = MongoClient(DATABASE_URL, serverSelectionTimeoutMS=5000)
    databases = client.list_database_names()
    print("Databases in cluster:")
    for db_name in databases:
        print(f" - {db_name}")
except Exception as e:
    print("Error:", e)
