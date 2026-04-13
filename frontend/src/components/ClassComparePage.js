import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const SUBJECTS = [
  { key: 'korean',  label: '국어' },
  { key: 'math',    label: '수학' },
  { key: 'english', label: '영어' },
  { key: 'society', label: '통합사회' },
  { key: 'science', label: '통합과학' },
  { key: 'history', label: '한국사' },
];

const VIEW_MODES = [
  { key: 'avg_std',   label: '평균 표준점수' },
  { key: 'avg_grade', label: '평균 등급' },
  { key: 'g1',        label: '1등급 인원' },
];

export default function ClassComparePage() {
  const [exams,        setExams]        = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [data,         setData]         = useState([]);
  const [viewMode,     setViewMode]     = useState('avg_std');
  const [viewSubject,  setViewSubject]  = useState('korean');
  const contentRef = useRef(null);

  useEffect(() => {
    api.get('/exams').then(res => setExams(res.data));
  }, []);

  const load = async () => {
    if (!selectedExam) return;
    const res = await api.get(
      `/analysis/class-compare?exam_name=${encodeURIComponent(selectedExam)}`
    );
    setData(res.data);
  };

  // 차트 데이터
  const chartData = data.map(d => ({
    name: `${d.ban}반`,
    value: d[viewSubject]?.[viewMode] ?? 0,
  }));

  // 반별 최고/최저
  const values   = chartData.map(d => d.value).filter(v => v > 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const savePDF = async () => {
    const el = contentRef.current;
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH  = (canvas.height * pageW) / canvas.width;
    let y = 0;
    while (y < imgH) {
      pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH);
      y += pageH;
      if (y < imgH) pdf.addPage();
    }
    pdf.save(`반별비교_${selectedExam}.pdf`);
  };

  const currentSubjectLabel = SUBJECTS.find(s => s.key === viewSubject)?.label;
  const currentModeLabel    = VIEW_MODES.find(m => m.key === viewMode)?.label;

  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        <h2 style={styles.title}>🏫 반별 성적 비교</h2>
        {data.length > 0 && (
          <button style={styles.pdfBtn} onClick={savePDF}>📄 PDF 저장</button>
        )}
      </div>

      {/* 시험 선택 */}
      <div style={styles.row}>
        <select style={styles.select} value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}>
          <option value="">시험 선택</option>
          {exams.map(e => (
            <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>
          ))}
        </select>
        <button style={styles.btn} onClick={load}>불러오기</button>
      </div>

      {data.length > 0 && (
        <div ref={contentRef}>
          {/* 보기 옵션 */}
          <div style={styles.optionCard}>
            <div style={styles.optionRow}>
              <span style={styles.optionLabel}>과목:</span>
              {SUBJECTS.map(s => (
                <button key={s.key} style={{
                  ...styles.chip,
                  ...(viewSubject === s.key ? styles.chipOn : {})
                }} onClick={() => setViewSubject(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div style={styles.optionRow}>
              <span style={styles.optionLabel}>기준:</span>
              {VIEW_MODES.map(m => (
                <button key={m.key} style={{
                  ...styles.chip,
                  ...(viewMode === m.key ? styles.chipOn : {})
                }} onClick={() => setViewMode(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 차트 */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>
              {currentSubjectLabel} — {currentModeLabel} 반별 비교
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  reversed={viewMode === 'avg_grade'}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={v => [
                    viewMode === 'g1' ? `${v}명` :
                    viewMode === 'avg_grade' ? `${v}등급` : `${v}점`,
                    currentModeLabel
                  ]}
                />
                <Bar dataKey="value" fill="#1e40af" radius={[6,6,0,0]}
                  label={{ position: 'top', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
            {viewMode === 'avg_grade' && (
              <p style={styles.note}>※ 등급은 낮을수록 우수 (Y축 역방향)</p>
            )}
          </div>

          {/* 상세 테이블 */}
          <div style={styles.tableCard}>
            <h3 style={styles.tableTitle}>반별 전체 현황</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>반</th>
                    <th style={styles.th}>인원</th>
                    {SUBJECTS.map(s => (
                      <React.Fragment key={s.key}>
                        <th style={styles.th}>{s.label}<br />평균등급</th>
                        {s.key !== 'english' && s.key !== 'history' && (
                          <th style={styles.th}>{s.label}<br />평균표준</th>
                        )}
                        <th style={styles.th}>{s.label}<br />1등급</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => {
                    const isMax = (field, subj) =>
                      d[subj]?.[field] === maxValue;

                    return (
                      <tr key={i} style={i % 2 === 0 ? {} : { background: '#f9fafb' }}>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{d.ban}반</td>
                        <td style={styles.td}>{d.total}명</td>
                        {SUBJECTS.map(s => (
                          <React.Fragment key={s.key}>
                            <td style={{
                              ...styles.td,
                              ...(viewSubject === s.key && viewMode === 'avg_grade'
                                ? { background: '#eff6ff', fontWeight: 'bold' } : {})
                            }}>
                              {d[s.key]?.avg_grade ?? '-'}
                            </td>
                            {s.key !== 'english' && s.key !== 'history' && (
                              <td style={{
                                ...styles.td,
                                ...(viewSubject === s.key && viewMode === 'avg_std'
                                  ? { background: '#eff6ff', fontWeight: 'bold' } : {})
                              }}>
                                {d[s.key]?.avg_std ?? '-'}
                              </td>
                            )}
                            <td style={{
                              ...styles.td,
                              ...(viewSubject === s.key && viewMode === 'g1'
                                ? { background: '#eff6ff', fontWeight: 'bold' } : {})
                            }}>
                              {d[s.key]?.g1 ?? 0}명
                            </td>
                          </React.Fragment>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container:  { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  titleRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title:      { fontSize: '24px', color: '#1e40af', margin: 0 },
  pdfBtn:     { background: '#dc2626', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  row:        { display: 'flex', gap: '12px', marginBottom: '16px' },
  select:     { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' },
  btn:        { background: '#1e40af', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' },
  optionCard: { background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  optionRow:  { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  optionLabel:{ fontSize: '13px', fontWeight: 'bold', color: '#374151', minWidth: '40px' },
  chip:       { padding: '4px 12px', borderRadius: '20px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: '13px' },
  chipOn:     { background: '#1e40af', color: 'white', border: '1px solid #1e40af', fontWeight: 'bold' },
  chartCard:  { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  chartTitle: { fontSize: '15px', fontWeight: 'bold', color: '#374151', marginBottom: '12px' },
  note:       { fontSize: '12px', color: '#9ca3af', marginTop: '8px' },
  tableCard:  { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  tableTitle: { fontSize: '15px', fontWeight: 'bold', color: '#374151', marginBottom: '12px' },
  table:      { borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
  th:         { padding: '8px', border: '1px solid #e5e7eb', background: '#eff6ff', textAlign: 'center', whiteSpace: 'nowrap' },
  td:         { padding: '7px', border: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap' },
};