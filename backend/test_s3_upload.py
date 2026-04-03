from fastapi.testclient import TestClient
from instagram import app
import os
import io

client = TestClient(app)

# Create a dummy image
dummy_image = io.BytesIO(b"dummy image data")
dummy_image.name = "test_image.jpg"

response = client.post(
    "/upload_image",
    files={"file": ("test_image.jpg", dummy_image, "image/jpeg")}
)

print(response.status_code)
print(response.json())
