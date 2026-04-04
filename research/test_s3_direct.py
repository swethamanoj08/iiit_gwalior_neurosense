import boto3
import os

from dotenv import load_dotenv
load_dotenv()

AWS_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_REGION = os.getenv("AWS_REGION")

print("--- TESTING AWS S3 UPLOAD ONLY ---")
try:
    s3 = boto3.client(
        's3',
        region_name=S3_REGION,
        aws_access_key_id=AWS_ID,
        aws_secret_access_key=AWS_KEY
    )
    test_data = b"Connection Test Data"
    filename = "test_connection_file.txt"
    s3.put_object(Bucket=S3_BUCKET_NAME, Key=filename, Body=test_data)
    print(f"✅ S3 Put Success: {filename}")

    url = f"https://{S3_BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{filename}"
    print(f"✅ S3 URL: {url}")

except Exception as e:
    print(f"❌ S3 Failed with error: {e}")
