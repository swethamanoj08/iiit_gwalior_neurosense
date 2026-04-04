import certifi
import urllib.parse
from pymongo import MongoClient

password = urllib.parse.quote_plus('g00BqxsW0XXpvyic')
client = MongoClient(
    f'mongodb+srv://piyushbhole37_db_user:{password}@cluster0.1ghsmpz.mongodb.net/?appName=Cluster0',
    tlsCAFile=certifi.where()
)
db = client.chatbotDB

print('Dropping posts collection...')
db.posts.drop()
print('Dropping stories collection...')
db.stories.drop()

print('Dummy data wiped successfully.')
