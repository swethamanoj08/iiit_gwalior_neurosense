import traceback
try:
    import uvicorn
    from instagram import app
    print("Starting uvicorn...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
except Exception as e:
    print("Failed to run uvicorn:")
    traceback.print_exc()
