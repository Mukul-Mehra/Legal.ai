from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import ask, auth

app = FastAPI(title="Legal AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ask.router, prefix="/api", tags=["ask"])
app.include_router(auth.router, prefix="/api", tags=["auth"])

@app.get("/health")
async def health():
    return {"status": "ok"}