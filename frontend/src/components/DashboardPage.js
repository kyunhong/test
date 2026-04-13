import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';

const SUBJECT_LABELS = {
  korean: '국어', math: '수학', english: '영어',
  society: '통합사회', science: '통합과학', history: '한국사',
};

export default function DashboardPage() {
  const [exams,        setExams]        = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [data,         setData]         = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/exams').then(res => {
      const list = Array.isArray(res.data) ? res.data 
                 : Array.isArray(res.data.exams) ? res.data.exams 
                 : [];

      setExams(list);
      // 가장 최근 시험 자동 선택
      if (list.length > 0) {
        setSelectedExam(list[list.length - 1].exam_name);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedExam) load(selectedExam);
  }, [selectedExam]);

  const load = async (name) => {
    const res = await api.get(
      `/analysis/dashboard?exam_name=${encodeURIComponent(name)}`
    );
    setData(res.data);
  };

  // 레이더 차트 데이터 (평균 등급 → 낮을수록 좋으므로 반전)
  const radarData = data ? Object.entries(SUBJECT_LABELS).map(([key, label]) => ({
    subject: label,
    value: data.subjects[key]?.avg_grade
      ? parseFloat((10 - data.subjects[key].avg_grade).toFixed(2))
      : 0,
    grade: data.subjects[key]?.avg_grade,
  })) : [];

  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        <h2 style={styles.title}>🏠 대시보드</h2>
        <select style={styles.select} value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}>
          {exams.map(e => (
            <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>
          ))}
        </select>
      </div>

      {data && (
        <>
          {/* ── 상단 요약 카드 ── */}
          <div style={styles.topCards}>
            <div style={styles.statCard}>
              <div style={styles.statNum}>{data.total}명</div>
              <div style={styles.statLabel}>전체 학생</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNum}>{data.ban_count}개</div>
              <div style={styles.statLabel}>반 수</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNum, color: '#dc2626' }}>
                {data.all_grade1.length}명
              </div>
              <div style={styles.statLabel}>전 과목 1~2등급</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNum, color: '#059669' }}>
                {data.subjects.korean.g1}명
              </div>
              <div style={styles.statLabel}>국어 1등급</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNum, color: '#059669' }}>
                {data.subjects.math.g1}명
              </div>
              <div style={styles.statLabel}>수학 1등급</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNum, color: '#059669' }}>
                {data.subjects.english.g1}명
              </div>
              <div style={styles.statLabel}>영어 1등급</div>
            </div>
          </div>

          {/* ── 중단: 과목별 현황 + 레이더 차트 ── */}
          <div style={styles.midRow}>
            {/* 과목별 카드 */}
            <div style={styles.subjectGrid}>
              {Object.entries(SUBJECT_LABELS).map(([key, label]) => {
                const s = data.subjects[key];
                const rate = data.total > 0
                  ? ((s.g1 / data.total) * 100).toFixed(1) : 0;
                return (
                  <div key={key} style={styles.subjectCard}>
                    <div style={styles.subjectName}>{label}</div>
                    {s.avg_std && (
                      <div style={styles.subjectRow2}>
                        <span style={styles.subjectKey}>평균표준</span>
                        <span style={styles.subjectVal}>{s.avg_std}</span>
                      </div>
                    )}
                    <div style={styles.subjectRow2}>
                      <span style={styles.subjectKey}>평균등급</span>
                      <span style={styles.subjectVal}>{s.avg_grade}</span>
                    </div>
                    <div style={styles.subjectRow2}>
                      <span style={styles.subjectKey}>1등급</span>
                      <span style={{ ...styles.subjectVal, color: '#dc2626', fontWeight: 'bold' }}>
                        {s.g1}명 ({rate}%)
                      </span>
                    </div>
                    {/* 1등급 비율 바 */}
                    <div style={styles.barBg}>
                      <div style={{
                        ...styles.barFill,
                        width: `${Math.min(rate * 5, 100)}%`
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 레이더 차트 */}
            <div style={styles.radarCard}>
              <h3 style={styles.radarTitle}>과목별 평균 등급</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13 }} />
                  <Radar
                    dataKey="value" stroke="#1e40af" fill="#1e40af"
                    fillOpacity={0.3}
                  />
                  <Tooltip
                    formatter={(val, name, props) =>
                      [`평균 ${props.payload.grade}등급`, '']
                    }
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── 바로가기 버튼 ── */}
          <div style={styles.linkRow}>
            {[
              { path: '/analysis',       icon: '📈', label: '성적 분석' },
              { path: '/ranking',        icon: '🏆', label: '학교 석차' },
              { path: '/class-compare',  icon: '🏫', label: '반별 비교' },
              { path: '/alert-students', icon: '🔔', label: '특이 학생' },
              { path: '/detail-compare', icon: '📊', label: '시험 비교' },
            ].map(item => (
              <button key={item.path} style={styles.linkBtn}
                onClick={() => navigate(item.path)}>
                <span style={{ fontSize: '22px' }}>{item.icon}</span>
                <span style={{ fontSize: '13px' }}>{item.label}</span>
              </button>
            ))}
          </div>

          {/* ── 우수 학생 목록 ── */}
          {data.all_grade1.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                ⭐ 전 과목 1~2등급 학생 ({data.all_grade1.length}명)
              </h3>
              <div style={styles.studentChips}>
                {data.all_grade1.map((s, i) => (
                  <span key={i} style={styles.studentChip}>
                    {s.ban}반 {s.number}번 {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!data && exams.length === 0 && (
        <div style={styles.empty}>
          <p>📂 업로드된 시험이 없습니다</p>
          <button style={styles.uploadBtn}
            onClick={() => navigate('/upload')}>
            업로드 하러 가기
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container:    { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  titleRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title:        { fontSize: '24px', color: '#1e40af', margin: 0 },
  select:       { padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' },
  topCards:     { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  statCard:     { flex: '1 1 120px', background: 'white', padding: '20px 16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  statNum:      { fontSize: '28px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' },
  statLabel:    { fontSize: '13px', color: '#6b7280' },
  midRow:       { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
  subjectGrid:  { flex: '1 1 400px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  subjectCard:  { background: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.07)' },
  subjectName:  { fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', fontSize: '14px' },
  subjectRow2:  { display: 'flex', justifyContent: 'space-between', marginBottom: '3px' },
  subjectKey:   { fontSize: '12px', color: '#6b7280' },
  subjectVal:   { fontSize: '12px', fontWeight: 'bold', color: '#111827' },
  barBg:        { height: '4px', background: '#e5e7eb', borderRadius: '2px', marginTop: '8px' },
  barFill:      { height: '4px', background: '#1e40af', borderRadius: '2px', transition: 'width 0.5s' },
  radarCard:    { flex: '1 1 300px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  radarTitle:   { fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' },
  linkRow:      { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
  linkBtn:      { flex: '1 1 100px', background: 'white', border: '1px solid #e5e7eb', padding: '14px 10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  card:         { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  cardTitle:    { fontSize: '15px', fontWeight: 'bold', color: '#1e40af', marginBottom: '12px' },
  studentChips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  studentChip:  { background: '#eff6ff', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #bfdbfe' },
  empty:        { textAlign: 'center', padding: '60px', color: '#6b7280' },
  uploadBtn:    { marginTop: '16px', background: '#1e40af', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' },
};