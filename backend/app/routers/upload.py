from fastapi import APIRouter, File, UploadFile, Form, Depends
from sqlalchemy.orm import Session
import pandas as pd
import io
from ..database import get_db
from ..models import ExamRecord

router = APIRouter()

@router.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    exam_name: str = Form(...),
    exam_date: str = Form(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))

    df.columns = [
        "ban", "number", "name",
        "korean_std", "korean_pct", "korean_grade",
        "math_std", "math_pct", "math_grade",
        "english_grade",
        "society_std", "society_pct", "society_grade",
        "science_std", "science_pct", "science_grade",
        "history_grade"
    ]

    # 기존 동일 시험 데이터 삭제 (덮어쓰기)
    db.query(ExamRecord).filter(
        ExamRecord.exam_name == exam_name
    ).delete()

    records = []
    for _, row in df.iterrows():
        record = ExamRecord(
            exam_name=exam_name,
            exam_date=exam_date,
            ban=int(row["ban"]) if pd.notna(row["ban"]) else 0,
            number=int(row["number"]) if pd.notna(row["number"]) else 0,
            name=str(row["name"]),
            korean_std=float(row["korean_std"]) if pd.notna(row["korean_std"]) else None,
            korean_pct=float(row["korean_pct"]) if pd.notna(row["korean_pct"]) else None,
            korean_grade=int(row["korean_grade"]) if pd.notna(row["korean_grade"]) else None,
            math_std=float(row["math_std"]) if pd.notna(row["math_std"]) else None,
            math_pct=float(row["math_pct"]) if pd.notna(row["math_pct"]) else None,
            math_grade=int(row["math_grade"]) if pd.notna(row["math_grade"]) else None,
            english_grade=int(row["english_grade"]) if pd.notna(row["english_grade"]) else None,
            society_std=float(row["society_std"]) if pd.notna(row["society_std"]) else None,
            society_pct=float(row["society_pct"]) if pd.notna(row["society_pct"]) else None,
            society_grade=int(row["society_grade"]) if pd.notna(row["society_grade"]) else None,
            science_std=float(row["science_std"]) if pd.notna(row["science_std"]) else None,
            science_pct=float(row["science_pct"]) if pd.notna(row["science_pct"]) else None,
            science_grade=int(row["science_grade"]) if pd.notna(row["science_grade"]) else None,
            history_grade=int(row["history_grade"]) if pd.notna(row["history_grade"]) else None,
        )
        records.append(record)

    db.add_all(records)
    db.commit()

    return {
        "message": f"{len(records)}명 데이터 업로드 완료",
        "exam_name": exam_name
    }


@router.get("/exams")
def get_exams(db: Session = Depends(get_db)):
    exams = db.query(
        ExamRecord.exam_name,
        ExamRecord.exam_date
    ).distinct().all()
    # 날짜순 정렬
    result = [{"exam_name": e[0], "exam_date": e[1]} for e in exams]
    result.sort(key=lambda x: x["exam_date"])
    return result


@router.delete("/exams/{exam_name}")
def delete_exam(exam_name: str, db: Session = Depends(get_db)):
    deleted = db.query(ExamRecord).filter(
        ExamRecord.exam_name == exam_name
    ).delete()
    db.commit()
    return {"message": f"'{exam_name}' 삭제 완료 ({deleted}명 데이터 삭제)"}