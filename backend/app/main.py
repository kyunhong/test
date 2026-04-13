from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import upload, analysis

Base.metadata.create_all(bind=engine)

app = FastAPI(title="모의고사 성적 분석 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 포트 허용으로 변경
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "모의고사 성적 분석 API 서버"}