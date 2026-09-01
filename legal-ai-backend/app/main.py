from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import ask, auth

app = FastAPI(title="Legal AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://legal-ai-frontend-beta.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.include_router(ask.router, prefix="/api", tags=["ask"])
app.include_router(auth.router, prefix="/api", tags=["auth"])


@app.get("/")
async def root():
    return {"message": "Legal AI Backend is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/debug")
async def debug():
    return {
        "app": "legal-ai-backend",
        "version": "2026-09-01",
        "status": "running"
    }
