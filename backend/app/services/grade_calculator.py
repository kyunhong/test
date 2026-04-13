# backend/app/services/grade_calculator.py
from typing import List, Dict, Any
import statistics

# 영어/한국사는 표준점수 없으므로 등급 기반 가중 처리
GRADE_WEIGHTS = {
    "korean": 1.0,
    "math": 1.0,
    "english": 1.0,
    "social": 0.5,
    "science": 0.5,
}

def calculate_avg_grade(student: Dict) -> float:
    """
    주요 과목 평균 등급 계산
    영어, 한국사는 등급제이므로 등급 그대로 평균에 포함
    """
    grades = []
    grade_map = {
        "korean_grade": "korean",
        "math_grade": "math",
        "english_grade": "english",
        "social_grade": "social",
        "science_grade": "science",
    }
    
    total_weight = 0
    weighted_sum = 0
    
    for col, subject in grade_map.items():
        grade = student.get(col)
        if grade is not None:
            weight = GRADE_WEIGHTS[subject]
            weighted_sum += grade * weight
            total_weight += weight
    
    if total_weight == 0:
        return None
    
    return round(weighted_sum / total_weight, 2)


def calculate_school_rank(students: List[Dict]) -> List[Dict]:
    """
    학교 석차 계산
    기준: 국어+수학 표준점수 합산 → 높을수록 높은 순위
    동점자 처리: 동일 석차 부여
    """
    def get_total_standard(s):
        korean = s.get("korean_standard") or 0
        math = s.get("math_standard") or 0
        return korean + math

    sorted_students = sorted(
        students, 
        key=get_total_standard, 
        reverse=True
    )
    
    rank = 1
    for i, student in enumerate(sorted_students):
        if i > 0:
            prev_total = get_total_standard(sorted_students[i-1])
            curr_total = get_total_standard(student)
            if curr_total < prev_total:
                rank = i + 1
        student["school_rank"] = rank
        student["avg_grade"] = calculate_avg_grade(student)
    
    return sorted_students


def calculate_grade_distribution(students: List[Dict], subject_grade_col: str) -> Dict:
    """
    특정 과목의 등급 분포 계산
    반환: {1: 5, 2: 12, 3: 20, ...} (등급: 인원수)
    """
    distribution = {i: 0 for i in range(1, 10)}
    
    for student in students:
        grade = student.get(subject_grade_col)
        if grade and 1 <= int(grade) <= 9:
            distribution[int(grade)] += 1
    
    return distribution


def calculate_subject_stats(students: List[Dict], standard_col: str) -> Dict:
    """
    표준점수 기반 통계 계산
    """
    scores = [
        s[standard_col] for s in students 
        if s.get(standard_col) is not None
    ]
    
    if not scores:
        return {}
    
    return {
        "mean": round(statistics.mean(scores), 2),
        "median": round(statistics.median(scores), 2),
        "stdev": round(statistics.stdev(scores), 2) if len(scores) > 1 else 0,
        "max": max(scores),
        "min": min(scores),
        "count": len(scores),
    }


def check_suneung_minimum(student: Dict, requirements: List[Dict]) -> Dict:
    """
    수능 최저학력기준 충족 여부 확인
    
    requirements 예시:
    [
      {"subjects": ["korean_grade", "math_grade"], "min_grade": 3, "count": 2},
      {"subjects": ["korean_grade", "math_grade", "english_grade"], "min_grade": 2, "count": 1}
    ]
    
    반환: {충족여부: bool, 충족항목: [...]}
    """
    results = []
    
    for req in requirements:
        subjects = req["subjects"]
        min_grade = req["min_grade"]
        required_count = req["count"]
        
        qualified = [
            subj for subj in subjects
            if student.get(subj) is not None 
            and int(student[subj]) <= min_grade
        ]
        
        results.append({
            "requirement": f"{len(subjects)}개 중 {required_count}개 {min_grade}등급 이내",
            "qualified_count": len(qualified),
            "required_count": required_count,
            "is_satisfied": len(qualified) >= required_count,
            "qualified_subjects": qualified,
        })
    
    all_satisfied = all(r["is_satisfied"] for r in results)
    
    return {
        "is_satisfied": all_satisfied,
        "details": results,
    }