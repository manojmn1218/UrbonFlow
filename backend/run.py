import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure backend directory is in python search path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    print("=" * 60)
    print(" UrbanFlow AI - Backend API Server Starting...")
    print(" Docs URL: http://localhost:8000/docs")
    print(" API Base: http://localhost:8000/api")
    print("=" * 60)
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
