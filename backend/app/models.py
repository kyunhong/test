from sqlalchemy import Column, Integer, String, Float, Date
from .database import Base

class ExamRecord(Base):
    __tablename__ = "exam_records"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=True, index=True)  # ✅ 추가
    exam_name = Column(String)
    exam_date = Column(String)
    ban = Column(Integer)
    number = Column(Integer)
    name = Column(String)
    korean_std = Column(Float, nullable=True)
    korean_pct = Column(Float, nullable=True)
    korean_grade = Column(Integer, nullable=True)
    math_std = Column(Float, nullable=True)
    math_pct = Column(Float, nullable=True)
    math_grade = Column(Integer, nullable=True)
    english_grade = Column(Integer, nullable=True)
    society_std = Column(Float, nullable=True)
    society_pct = Column(Float, nullable=True)
    society_grade = Column(Integer, nullable=True)
    science_std = Column(Float, nullable=True)
    science_pct = Column(Float, nullable=True)
    science_grade = Column(Integer, nullable=True)
    history_grade = Column(Integer, nullable=True)