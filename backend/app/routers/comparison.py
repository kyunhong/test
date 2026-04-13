# backend/app/routers/comparison.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.grade import StudentGrade, Exam
from ..services.grade_calculator import calculate_grade_distribution

router = APIRouter()


@router.get("/exams/{exam_id1}/{exam_id2}")
def compare_exams(
    exam_id1: int,
    exam_id2: int,
    db: Session = Depends(get_db)
):
    """두 시험 간 전체 통계 비교"""
    
    def get_exam_data(exam_id):
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(404, f"시험 ID {exam_id}를 찾을 수 없습니다.")
        students = db.query(StudentGrade).filter(
            StudentGrade.exam_id == exam_id
        ).all()
        return exam, [
            {c.name: getattr(s, c.name) for c in s.__table__.columns}
            for s in students
        ]
    
    exam1, students1 = get_exam_data(exam_id1)
    exam2, students2 = get_exam_data(exam_id2)
    
    grade_cols = {
        "korean": "korean_grade",
        "math": "math_grade",
        "english": "english_grade",
        "social": "social_grade",
        "science": "science_grade",
        "history": "history_grade",
    }
    
    comparison = {
        "exam1": {"id": exam1.id, "name": exam1.name, "date": exam1.exam_date},
        "exam2": {"id": exam2.id, "name": exam2.name, "date": exam2.exam_date},
        "grade1_change": {},
        "distribution_change": {},
    }
    
    for subject, grade_col in grade_cols.items():
        dist1 = calculate_grade_distribution(students1, grade_col)
        dist2 = calculate_grade_distribution(students2, grade_col)
        
        comparison["grade1_change"][subject] = {
            "before": dist1.get(1, 0),
            "after": dist2.get(1, 0),
            "change": dist2.get(1, 0) - dist1.get(1, 0),
        }
        comparison["distribution_change"][subject] = {
            "before": dist1,
            "after": dist2,
        }
    
    return comparison


@router.get("/student/{name}/{class_num}")
def get_student_history(
    name: str,
    class_num: int,
    db: Session = Depends(get_db)
):
    """특정 학생의 시험별 성적 변화 추이"""
    records = db.query(StudentGrade, Exam).join(
        Exam, StudentGrade.exam_id == Exam.id
    ).filter(
        StudentGrade.name == name,
        StudentGrade.class_num == class_num,
    ).order_by(Exam.exam_date).all()
    
    if not records:
        raise HTTPException(404, "해당 학생 기록이 없습니다.")
    
    history = []
    for student, exam in records:
        history.append({
            "exam_id": exam.id,
            "exam_name": exam.name,
            "exam_date": exam.exam_date,
            "korean_grade": student.korean_grade,
            "math_grade": student.math_grade,
            "english_grade": student.english_grade,
            "social_grade": student.social_grade,
            "science_grade": student.science_grade,
            "history_grade": student.history_grade,
            "avg_grade": student.avg_grade,
            "school_rank": student.school_rank,
        })
    
    return {
        "name": name,
        "class_num": class_num,
        "history": history,
    }