import boto3
import os
from dotenv import load_dotenv

load_dotenv()

s3_client = boto3.client(
    's3', 
    region_name=os.environ.get('AWS_REGION', 'ap-south-1'),
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
)

try:
    # verify access to the specific bucket
    bucket_name = os.environ.get('S3_BUCKET_NAME')
    print(f'Testing access to bucket: {bucket_name}...')
    s3_client.head_bucket(Bucket=bucket_name)
    print('SUCCESS: AWS S3 is correctly connected and bucket is accessible.')
    with open('aws_result.txt', 'w') as f:
        f.write('SUCCESS')
except Exception as e:
    print(f'FAIL: Could not connect to AWS or access bucket. Error: {e}')
    with open('aws_result.txt', 'w') as f:
        f.write(f'FAIL: {e}')
