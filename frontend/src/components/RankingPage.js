import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getSessionId } from '../App'; 

const gradeColor = (g) => {
  if (!g) return {};
  if (g === 1) return { color: '#dc2626', fontWeight: 'bold' };
  if (g === 2) return { color: '#d97706', fontWeight: 'bold' };
  if (g === 3) return { color: '#059669' };
  return {};
};

const STD_SUBJECTS = [
  { key: 'korean',  label: '국어' },
  { key: 'math',    label: '수학' },
  { key: 'society', label: '통합사회' },
  { key: 'science', label: '통합과학' },
];

const GRADE_SUBJECTS = [
  { key: 'korean',  label: '국어' },
  { key: 'math',    label: '수학' },
  { key: 'english', label: '영어' },
  { key: 'society', label: '통합사회' },
  { key: 'science', label: '통합과학' },
  { key: 'history', label: '한국사' },
];

export default function RankingPage() {
  const [exams,        setExams]        = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [mode,         setMode]         = useState('std');
  const [ranking,      setRanking]      = useState([]);
  const [filterBan,    setFilterBan]    = useState('전체');
  const [search,       setSearch]       = useState('');
  const contentRef = useRef(null);
  const [stdSubjects, setStdSubjects] = useState(
    Object.fromEntries(STD_SUBJECTS.map(s => [s.key, true]))
  );
  const [gradeSubjects, setGradeSubjects] = useState(
    Object.fromEntries(GRADE_SUBJECTS.map(s => [s.key, true]))
  );

  // ✅ session_id 가져오기
  //const getSessionId = () => localStorage.getItem('session_id');

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

  const load = async () => {
    if (!selectedExam) return;

    const subjectMap    = mode === 'std' ? stdSubjects : gradeSubjects;
    const selectedKeys  = Object.entries(subjectMap)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');

    const sessionId = getSessionId();  // ✅ session_id 가져오기
    const res = await api.get(
      `/analysis/ranking?exam_name=${encodeURIComponent(selectedExam)}&mode=${mode}&subjects=${selectedKeys}&session_id=${sessionId}`  // ✅ session_id 추가
    );
    setRanking(res.data);
  };

  // PDF 저장
  const savePDF = async () => {
    const el     = contentRef.current;
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf    = new jsPDF('l', 'mm', 'a4');
    const pageW  = pdf.internal.pageSize.getWidth();
    const pageH  = pdf.internal.pageSize.getHeight();
    const imgH   = (canvas.height * pageW) / canvas.width;
    let y = 0;
    while (y < imgH) {
      pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH);
      y += pageH;
      if (y < imgH) pdf.addPage();
    }
    pdf.save(`학교석차_${selectedExam || '결과'}.pdf`);
  };

  const bans = ['전체', ...[...new Set(ranking.map(r => r.ban))]
    .sort((a, b) => a - b)];

  const filtered = ranking.filter(r => {
    const banOk  = filterBan === '전체' || r.ban === Number(filterBan);
    const nameOk = r.name.includes(search);
    return banOk && nameOk;
  });

  const currentSubjects   = mode === 'std' ? STD_SUBJECTS   : GRADE_SUBJECTS;
  const currentChecked    = mode === 'std' ? stdSubjects     : gradeSubjects;
  const setCurrentChecked = mode === 'std' ? setStdSubjects  : setGradeSubjects;

  const selectedLabel = currentSubjects
    .filter(s => currentChecked[s.key])
    .map(s => s.label)
    .join(' + ');

  return (
    <div style={styles.container}>
      {/* ── 제목 + PDF ── */}
      <div style={styles.titleRow}>
        <h2 style={styles.title}>🏆 학교 석차</h2>
        {ranking.length > 0 && (
          <button style={styles.pdfBtn} onClick={savePDF}>
            📄 PDF 저장
          </button>
        )}
      </div>

      {/* ── 설정 카드 ── */}
      <div style={styles.settingCard}>
        <div style={styles.settingRow}>
          <select style={styles.select} value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}>
            <option value="">시험 선택</option>
            {(Array.isArray(exams) ? exams : []).map(e => (
              <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>
            ))}
          </select>

          <div style={styles.modeBox}>
            <label style={styles.modeLabel}>
              <input type="radio" value="std" checked={mode === 'std'}
                onChange={() => setMode('std')} />
              {' '}표준점수 합산
            </label>
            <label style={styles.modeLabel}>
              <input type="radio" value="grade" checked={mode === 'grade'}
                onChange={() => setMode('grade')} />
              {' '}등급 평균
            </label>
          </div>

          <button style={styles.btn} onClick={load}>조회</button>
        </div>

        {/* 과목 체크박스 */}
        <div style={styles.subjectSection}>
          <span style={styles.subjectLabel}>
            {mode === 'std' ? '합산 과목:' : '평균 과목:'}
          </span>
          <div style={styles.subjectRow}>
            {currentSubjects.map(s => (
              <label key={s.key} style={{
                ...styles.subjectChip,
                ...(currentChecked[s.key] ? styles.subjectChipOn : {})
              }}>
                <input type="checkbox"
                  checked={currentChecked[s.key]}
                  onChange={e => setCurrentChecked(prev => ({
                    ...prev, [s.key]: e.target.checked
                  }))}
                  style={{ display: 'none' }} />
                {s.label}
              </label>
            ))}
          </div>
          {selectedLabel && (
            <span style={styles.selectedInfo}>
              → {selectedLabel} {mode === 'std' ? '표준점수 합' : '등급 평균'}으로 정렬
            </span>
          )}
        </div>
      </div>

      {/* ── ref 영역 시작 ── */}
      <div ref={contentRef}>
        {/* 반 필터 + 검색 */}
        {ranking.length > 0 && (
          <div style={styles.filterRow}>
            <div style={styles.banBtns}>
              {bans.map(b => (
                <button key={b} style={{
                  ...styles.banBtn,
                  ...(filterBan === String(b) ? styles.banBtnActive : {})
                }} onClick={() => setFilterBan(String(b))}>
                  {b === '전체' ? '전체' : `${b}반`}
                </button>
              ))}
            </div>
            <input placeholder="이름 검색" value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput} />
            <span style={styles.count}>
              {filtered.length}명 / 전체 {ranking.length}명
            </span>
          </div>
        )}

        {/* 테이블 */}
        {filtered.length > 0 && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {[
                    '전교석차','반','번호','이름',
                    '국어표준','국어등급',
                    '수학표준','수학등급',
                    '영어등급',
                    '사회표준','사회등급',
                    '과학표준','과학등급',
                    '한국사등급',
                    mode === 'std' ? '표준점수합' : '등급평균'
                  ].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} style={
                    r.rank === 1 ? { background: '#fef9c3' } :
                    r.rank <= 3  ? { background: '#fffbeb' } :
                    i % 2 === 0  ? {}                        :
                                   { background: '#f9fafb' }
                  }>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>
                      {r.rank === 1 ? '🥇' :
                       r.rank === 2 ? '🥈' :
                       r.rank === 3 ? '🥉' : r.rank}
                    </td>
                    <td style={styles.td}>{r.ban}</td>
                    <td style={styles.td}>{r.number}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{r.name}</td>
                    <td style={styles.td}>{r.korean_std  ?? '-'}</td>
                    <td style={{ ...styles.td, ...gradeColor(r.korean_grade)  }}>{r.korean_grade  ?? '-'}</td>
                    <td style={styles.td}>{r.math_std    ?? '-'}</td>
                    <td style={{ ...styles.td, ...gradeColor(r.math_grade)    }}>{r.math_grade    ?? '-'}</td>
                    <td style={{ ...styles.td, ...gradeColor(r.english_grade) }}>{r.english_grade ?? '-'}</td>
                    <td style={styles.td}>{r.society_std ?? '-'}</td>
                    <td style={{ ...styles.td, ...gradeColor(r.society_grade) }}>{r.society_grade ?? '-'}</td>
                    <td style={styles.td}>{r.science_std ?? '-'}</td>
                    <td style={{ ...styles.td, ...gradeColor(r.science_grade) }}>{r.science_grade ?? '-'}</td>
                    <td style={{ ...styles.td, ...gradeColor(r.history_grade) }}>{r.history_grade ?? '-'}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: '#1e40af' }}>
                      {r.sort_val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ── ref 영역 끝 ── */}
    </div>
  );
}

const styles = {
  container:      { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  titleRow:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title:          { fontSize: '24px', color: '#1e40af', margin: 0 },
  pdfBtn:         { background: '#dc2626', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  settingCard:    { background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  settingRow:     { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' },
  select:         { flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' },
  modeBox:        { display: 'flex', gap: '16px', background: '#f9fafb', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e5e7eb' },
  modeLabel:      { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' },
  btn:            { background: '#1e40af', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' },
  subjectSection: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f3f4f6' },
  subjectLabel:   { fontSize: '13px', fontWeight: 'bold', color: '#374151' },
  subjectRow:     { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  subjectChip:    { padding: '4px 12px', borderRadius: '20px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: '13px', userSelect: 'none' },
  subjectChipOn:  { background: '#1e40af', color: 'white', border: '1px solid #1e40af', fontWeight: 'bold' },
  selectedInfo:   { fontSize: '12px', color: '#6b7280' },
  filterRow:      { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  banBtns:        { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  banBtn:         { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '13px' },
  banBtnActive:   { background: '#1e40af', color: 'white', border: '1px solid #1e40af' },
  searchInput:    { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' },
  count:          { color: '#6b7280', fontSize: '14px' },
  tableWrap:      { overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  table:          { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:             { padding: '10px 8px', border: '1px solid #e5e7eb', background: '#eff6ff', whiteSpace: 'nowrap', textAlign: 'center' },
  td:             { padding: '7px 8px', border: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap' },
};