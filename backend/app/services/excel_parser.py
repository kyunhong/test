# backend/app/services/excel_parser.py
import pandas as pd
from typing import List, Dict, Any
import re

COLUMN_MAPPING = {
    "반": "class_num",
    "번호": "student_num",
    "이름": "name",
    "국어표준점수": "korean_standard",
    "국어백분위": "korean_percentile",
    "국어등급": "korean_grade",
    "수학표준점수": "math_standard",
    "수학백분위": "math_percentile",
    "수학등급": "math_grade",
    "영어등급": "english_grade",
    "통합사회표준점수": "social_standard",
    "통합사회백분위": "social_percentile",
    "통합사회등급": "social_grade",
    "통합과학표준점수": "science_standard",
    "통합과학백분위": "science_percentile",
    "통합과학등급": "science_grade",
    "한국사등급": "history_grade",
}

def parse_excel(file_path: str) -> List[Dict[str, Any]]:
    """엑셀 파일을 파싱하여 학생 데이터 리스트 반환"""
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        raise ValueError(f"엑셀 파일 읽기 오류: {str(e)}")
    
    # 컬럼명 공백 제거 및 매핑
    df.columns = df.columns.str.strip()
    df = df.rename(columns=COLUMN_MAPPING)
    
    # 필수 컬럼 검증
    required_cols = ["class_num", "student_num", "name"]
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(f"필수 컬럼 누락: {missing}")
    
    # NaN 처리
    df = df.where(pd.notnull(df), None)
    
    # 숫자형 컬럼 변환
    numeric_cols = [
        "class_num", "student_num",
        "korean_standard", "korean_percentile", "korean_grade",
        "math_standard", "math_percentile", "math_grade",
        "english_grade",
        "social_standard", "social_percentile", "social_grade",
        "science_standard", "science_percentile", "science_grade",
        "history_grade",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    return df.to_dict(orient="records")


def validate_grades(data: List[Dict]) -> List[str]:
    """데이터 유효성 검사, 경고 메시지 리스트 반환"""
    warnings = []
    grade_cols = [
        "korean_grade", "math_grade", "english_grade",
        "social_grade", "science_grade", "history_grade"
    ]
    
    for i, row in enumerate(data):
        for col in grade_cols:
            val = row.get(col)
            if val is not None and not (1 <= int(val) <= 9):
                warnings.append(
                    f"Row {i+1} ({row.get('name')}): "
                    f"{col} 값 {val}이 1-9 범위를 벗어남"
                )
    return warnings