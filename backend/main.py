from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

app = FastAPI()

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HouseRequest(BaseModel):
    prompt: Optional[str] = None
    # We will add more structured data fields here later

@app.get("/")
def read_root():
    return {"message": "House Maker API is ready"}

@app.post("/generate")
def generate_house(request: HouseRequest):
    # Placeholder for future AI logic
    return {
        "status": "simulated",
        "data": {
            "parts": [{
                "id": "generated_house",
                "dimensions": { "width": 12.0, "height": 6.0, "depth": 8.0 },
                "material": { "color_hex": "#EFEFEF" },
                "roof": { "shape": "gabled", "height": 4.0, "overhang": 0.6, "color_hex": "#883322" },
                # Simplified for now
                "facades": []
            }]
        }
    }
