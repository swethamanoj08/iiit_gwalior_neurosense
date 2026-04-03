import pymongo
from pymongo import MongoClient
import ssl

orig_create_default_context = ssl.create_default_context
def create_unverified_context(*args, **kwargs):
    ctx = orig_create_default_context(*args, **kwargs)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

ssl.create_default_context = create_unverified_context

uri = "mongodb+srv://piyushbhole37_db_user:g00BqxsW0XXpvyic@cluster0.1ghsmpz.mongodb.net/chatbotDB?retryWrites=true&w=majority"
try:
    print("Testing with monkeypatched ssl...")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("SUCCESS")
except Exception as e:
    print("FAIL:", e)
