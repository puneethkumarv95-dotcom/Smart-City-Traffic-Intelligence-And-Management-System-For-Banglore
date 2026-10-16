from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(
    title="SCTIMS AI & Computer Vision Microservice",
    description="Python FastAPI service handling vehicle counting, incident classification, signal simulation & traffic forecasting for Smart City Traffic Management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "SCTIMS AI & Mobility Analytics Microservice",
        "city": "Bengaluru",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models_loaded": {
            "vehicle_counter": "initialized",
            "incident_classifier": "initialized",
            "traffic_forecaster": "initialized"
        }
    }

