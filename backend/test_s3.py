import boto3
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="c:/Users/Asus/Desktop/wellness 360/.env")
s3 = boto3.client('s3', region_name=os.getenv('AWS_REGION'))

try:
    response = s3.list_buckets()
    print("Buckets:")
    for bucket in response['Buckets']:
        print(f"  {bucket['Name']}")
except Exception as e:
    print(f"Error: {e}")
