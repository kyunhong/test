# backend/app/models/grade.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
import datetime

class Exam(Base):
    """시험 회차 정보"""
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)          # 예: "2024년 3월 모의고사"
    exam_date = Column(String, nullable=False)      # 예: "2024-03"
    grade_year = Column(Integer, nullable=False)    # 학년 (1, 2, 3)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    students = relationship("StudentGrade", back_populates="exam")


class StudentGrade(Base):
    """학생별 성적 데이터"""
    __tablename__ = "student_grades"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    
    # 학생 기본 정보
    class_num = Column(Integer, nullable=False)     # 반
    student_num = Column(Integer, nullable=False)   # 번호
    name = Column(String, nullable=False)           # 이름
    
    # 국어
    korean_standard = Column(Integer, nullable=True)
    korean_percentile = Column(Integer, nullable=True)
    korean_grade = Column(Integer, nullable=True)
    
    # 수학
    math_standard = Column(Integer, nullable=True)
    math_percentile = Column(Integer, nullable=True)
    math_grade = Column(Integer, nullable=True)
    
    # 영어
    english_grade = Column(Integer, nullable=True)
    
    # 통합사회
    social_standard = Column(Integer, nullable=True)
    social_percentile = Column(Integer, nullable=True)
    social_grade = Column(Integer, nullable=True)
    
    # 통합과학
    science_standard = Column(Integer, nullable=True)
    science_percentile = Column(Integer, nullable=True)
    science_grade = Column(Integer, nullable=True)
    
    # 한국사
    history_grade = Column(Integer, nullable=True)
    
    # 계산 필드
    school_rank = Column(Integer, nullable=True)    # 학교 석차
    avg_grade = Column(Float, nullable=True)        # 평균 등급
    
    exam = relationship("Exam", back_populates="students")