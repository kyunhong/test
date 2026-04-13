from sqlalchemy import Column, Integer, String, Float, Date
from .database import Base

class ExamRecord(Base):
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, index=True)
    exam_name = Column(String)        # 예: "2024년 3월 모의고사"
    exam_date = Column(String)        # 예: "2024-03"

    ban = Column(Integer)             # 반
    number = Column(Integer)          # 번호
    name = Column(String)             # 이름

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