from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import upload, analysis
from .database import migrate

migrate()
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="모의고사 성적 분석 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://kyunhong.github.io",
        "https://test-production-0860.up.railway.app",  # ✅ 추가
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "모의고사 성적 분석 API 서버"}