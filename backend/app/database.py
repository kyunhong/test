from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./scores.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ 컬럼 자동 추가
def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE exam_records ADD COLUMN session_id VARCHAR"))
            conn.commit()
            print("✅ session_id 컬럼 추가 완료")
        except Exception as e:
            print(f"이미 있거나 에러: {e}")