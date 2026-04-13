from pydantic import BaseModel
from typing import Optional

class ExamRecordSchema(BaseModel):
    exam_name: str
    exam_date: str
    ban: int
    number: int
    name: str
    korean_std: Optional[float]
    korean_pct: Optional[float]
    korean_grade: Optional[int]
    math_std: Optional[float]
    math_pct: Optional[float]
    math_grade: Optional[int]
    english_grade: Optional[int]
    society_std: Optional[float]
    society_pct: Optional[float]
    society_grade: Optional[int]
    science_std: Optional[float]
    science_pct: Optional[float]
    science_grade: Optional[int]
    history_grade: Optional[int]

    class Config:
        from_attributes = True