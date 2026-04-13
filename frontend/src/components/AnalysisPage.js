import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { getSessionId } from '../App'; 

// ─────────────────────────────────────────
// 등급 클릭 모달
// ─────────────────────────────────────────
function GradeModal({ subject, grade, students, onClose }) {
  if (!students) return null;
  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.box} onClick={e => e.stopPropagation()}>
        <div style={modal.header}>
          <span>{subject} {grade}등급 학생 ({students.length}명)</span>
          <button style={modal.close} onClick={onClose}>✕</button>
        </div>
        <table style={modal.table}>
          <thead>
            <tr>
              <th style={modal.th}>반</th>
              <th style={modal.th}>번호</th>
              <th style={modal.th}>이름</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={i} style={i % 2 === 0 ? {} : { background: '#f9fafb' }}>
                <td style={modal.td}>{s.ban}</td>
                <td style={modal.td}>{s.number}</td>
                <td style={modal.td}>{s.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 등급별 색상
// ─────────────────────────────────────────
const BAR_COLORS = [
  '#dc2626','#ea580c','#d97706',
  '#65a30d','#16a34a','#0891b2',
  '#2563eb','#7c3aed','#9f1239'
];

// ─────────────────────────────────────────
// 과목별 등급 분포 차트 (막대 클릭 → 모달)
// ─────────────────────────────────────────
function GradeBarChart({ label, dist, gradeStudents }) {
  const [modalInfo, setModalInfo] = useState(null);

  const data = [1,2,3,4,5,6,7,8,9].map(g => ({
    grade:    `${g}등급`,
    gradeNum: g,
    count:    dist?.[g] || 0,
  }));

  const handleClick = (payload) => {
    if (!payload) return;
    const g        = payload.gradeNum;
    const students = gradeStudents?.[g] || [];
    setModalInfo({ grade: g, students });
  };

  return (
    <div style={styles.chartBox}>
      <h3 style={styles.chartTitle}>
        {label}
        <span style={styles.clickHint}> ← 막대 클릭 시 학생 목록</span>
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          onClick={e => e?.activePayload && handleClick(e.activePayload[0]?.payload)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={v => [`${v}명`, '인원']} />
          <Bar dataKey="count" cursor="pointer" radius={[4,4,0,0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={BAR_COLORS[idx]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {modalInfo && (
        <GradeModal
          subject={label}
          grade={modalInfo.grade}
          students={modalInfo.students}
          onClose={() => setModalInfo(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────
export default function AnalysisPage() {
  const [exams,        setExams]        = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [summary,      setSummary]      = useState(null);
  const contentRef = useRef(null);

  // ✅ session_id 가져오기
 // const getSessionId = () => localStorage.getItem('session_id');

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;  // ✅ session_id 없으면 조회 안함

    api.get('/exams', { params: { session_id: sessionId } })  // ✅ session_id 추가
      .then(res => {
        const list = Array.isArray(res.data) ? res.data
                   : Array.isArray(res.data.exams) ? res.data.exams
                   : [];
        setExams(list);
      });
  }, []);

  const loadAnalysis = async () => {
    if (!selectedExam) return;
    const sessionId = getSessionId();  // ✅ session_id 가져오기
    const res = await api.get(
      `/analysis/summary?exam_name=${encodeURIComponent(selectedExam)}&session_id=${sessionId}`  // ✅ session_id 추가
    );
    setSummary(res.data);
  };

  // PDF 저장
  const savePDF = async () => {
    const el     = contentRef.current;
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf    = new jsPDF('p', 'mm', 'a4');
    const pageW  = pdf.internal.pageSize.getWidth();
    const pageH  = pdf.internal.pageSize.getHeight();
    const imgH   = (canvas.height * pageW) / canvas.width;
    let y = 0;
    while (y < imgH) {
      pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH);
      y += pageH;
      if (y < imgH) pdf.addPage();
    }
    pdf.save(`성적분석_${selectedExam || '결과'}.pdf`);
  };

  // 요약 카드 데이터
  const summaryCards = summary ? [
    {
      label: '국어',
      std:   summary.korean.avg_std,
      pct:   summary.korean.avg_pct,
      g1:    summary.korean.grade1_count,
    },
    {
      label: '수학',
      std:   summary.math.avg_std,
      pct:   summary.math.avg_pct,
      g1:    summary.math.grade1_count,
    },
    {
      label: '영어',
      std:   null,
      pct:   null,
      g1:    summary.english.grade1_count,
    },
    {
      label: '통합사회',
      std:   summary.society.avg_std,
      pct:   null,
      g1:    summary.society.grade_dist?.[1] || 0,
    },
    {
      label: '통합과학',
      std:   summary.science.avg_std,
      pct:   null,
      g1:    summary.science.grade_dist?.[1] || 0,
    },
    {
      label: '한국사',
      std:   null,
      pct:   null,
      g1:    summary.history.grade_dist?.[1] || 0,
    },
  ] : [];

  return (
    <div style={styles.container}>
      {/* ── 제목 + PDF 버튼 ── */}
      <div style={styles.titleRow}>
        <h2 style={styles.title}>📈 성적 분석</h2>
        {summary && (
          <button style={styles.pdfBtn} onClick={savePDF}>
            📄 PDF 저장
          </button>
        )}
      </div>

      {/* ── 시험 선택 ── */}
      <div style={styles.selectRow}>
        <select style={styles.select} value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}>
          <option value="">시험 선택</option>
          {(Array.isArray(exams) ? exams : []).map(e => (
            <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>
          ))}
        </select>
        <button style={styles.button} onClick={loadAnalysis}>분석</button>
      </div>

      {/* ── PDF 캡처 영역 ── */}
      <div ref={contentRef}>
        {summary && (
          <>
            {/* 요약 카드 */}
            <div style={styles.cardRow}>
              {summaryCards.map(item => (
                <div key={item.label} style={styles.card}>
                  <h3 style={styles.cardTitle}>{item.label}</h3>
                  {item.std != null && (
                    <p style={styles.cardText}>
                      평균 표준점수 <b>{item.std}</b>
                    </p>
                  )}
                  {item.pct != null && (
                    <p style={styles.cardText}>
                      평균 백분위 <b>{item.pct}</b>
                    </p>
                  )}
                  <p style={styles.grade1Text}>
                    1등급 <b>{item.g1}명</b>
                    <span style={styles.pctText}>
                      {' '}({summary.total > 0
                        ? ((item.g1 / summary.total) * 100).toFixed(1)
                        : 0}%)
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {/* 등급 분포 차트 6개 */}
            <div style={styles.chartGrid}>
              <GradeBarChart
                label="국어"
                dist={summary.korean.grade_dist}
                gradeStudents={summary.korean.grade_students}
              />
              <GradeBarChart
                label="수학"
                dist={summary.math.grade_dist}
                gradeStudents={summary.math.grade_students}
              />
              <GradeBarChart
                label="영어"
                dist={summary.english.grade_dist}
                gradeStudents={summary.english.grade_students}
              />
              <GradeBarChart
                label="통합사회"
                dist={summary.society.grade_dist}
                gradeStudents={summary.society.grade_students}
              />
              <GradeBarChart
                label="통합과학"
                dist={summary.science.grade_dist}
                gradeStudents={summary.science.grade_students}
              />
              <GradeBarChart
                label="한국사"
                dist={summary.history.grade_dist}
                gradeStudents={summary.history.grade_students}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────
const styles = {
  container:  { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  titleRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title:      { fontSize: '24px', color: '#1e40af', margin: 0 },
  pdfBtn:     { background: '#dc2626', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  selectRow:  { display: 'flex', gap: '12px', marginBottom: '24px' },
  select:     { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' },
  button:     { background: '#1e40af', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer' },
  cardRow:    { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  card:       { flex: '1 1 140px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTitle:  { color: '#1e40af', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' },
  cardText:   { fontSize: '13px', color: '#374151', marginBottom: '4px' },
  grade1Text: { color: '#dc2626', marginTop: '8px', fontSize: '14px' },
  pctText:    { color: '#6b7280', fontSize: '12px' },
  chartGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' },
  chartBox:   { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  chartTitle: { marginBottom: '12px', color: '#374151', fontSize: '15px', fontWeight: 'bold' },
  clickHint:  { fontSize: '11px', color: '#9ca3af', fontWeight: 'normal' },
};

const modal = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  box:     { background: 'white', borderRadius: '12px', padding: '24px', minWidth: '300px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold', color: '#1e40af' },
  close:   { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' },
  table:   { width: '100%', borderCollapse: 'collapse' },
  th:      { padding: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' },
  td:      { padding: '7px', border: '1px solid #e5e7eb', textAlign: 'center' },
};