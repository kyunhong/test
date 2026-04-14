import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { getSessionId } from '../App'; 

const EXPLORE_OPTIONS = [
  { value: 'avg',   label: '평균 (소수점 버림)', desc: '(사회+과학)÷2' },
  { value: 'best',  label: '유리한 과목 채택',   desc: '둘 중 좋은 등급' },
  { value: 'worst', label: '두 과목 모두 충족',  desc: '둘 중 나쁜 등급' },
];

const GRADE_COLORS = {
  1: { bg: '#dbeafe', color: '#1e40af' },
  2: { bg: '#e0f2fe', color: '#0369a1' },
  3: { bg: '#d1fae5', color: '#065f46' },
  4: { bg: '#fef9c3', color: '#854d0e' },
  5: { bg: '#fde68a', color: '#92400e' },
  6: { bg: '#fed7aa', color: '#9a3412' },
  7: { bg: '#fecaca', color: '#991b1b' },
  8: { bg: '#fca5a5', color: '#7f1d1d' },
  9: { bg: '#f87171', color: '#450a0a' },
};

const GradeChip = ({ grade }) => {
  if (grade == null) return <span style={styles.nullChip}>-</span>;
  const c = GRADE_COLORS[grade] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ ...styles.gradeChip, background: c.bg, color: c.color }}>
      {grade}
    </span>
  );
};

const calcAvgGrade = (s) => {
  const grades = [
    s.korean_grade,
    s.math_grade,
    s.english_grade,
    s.society_grade,
    s.science_grade,
  ].filter(g => g != null);
  if (grades.length === 0) return null;
  return (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
};

const avgGradeColor = (avg) => {
  if (avg == null) return { bg: '#f3f4f6', color: '#6b7280' };
  const v = parseFloat(avg);
  if (v < 2) return { bg: '#dbeafe', color: '#1e40af' };
  if (v < 3) return { bg: '#e0f2fe', color: '#0369a1' };
  if (v < 4) return { bg: '#d1fae5', color: '#065f46' };
  if (v < 5) return { bg: '#fef9c3', color: '#854d0e' };
  if (v < 6) return { bg: '#fde68a', color: '#92400e' };
  if (v < 7) return { bg: '#fed7aa', color: '#9a3412' };
  if (v < 8) return { bg: '#fecaca', color: '#991b1b' };
  if (v < 9) return { bg: '#fca5a5', color: '#7f1d1d' };
  return { bg: '#f87171', color: '#450a0a' };
};

const SORT_OPTIONS = [
  { value: 'default',    label: '기본순',         desc: '위험 수 많은 순' },
  { value: 'ban_number', label: '반·번호순',      desc: '반 → 번호 오름차순' },
  { value: 'avg_asc',    label: '평균 내신순',    desc: '평균 낮은(좋은) 순' },
  { value: 'avg_desc',   label: '평균 내신 역순', desc: '평균 높은(나쁜) 순' },
];

const sortData = (arr, sortKey) => {
  const copy = [...arr];
  if (sortKey === 'ban_number') {
    return copy.sort((a, b) =>
      a.ban !== b.ban ? a.ban - b.ban : a.number - b.number
    );
  }
  if (sortKey === 'avg_asc') {
    return copy.sort((a, b) =>
      parseFloat(calcAvgGrade(a) ?? 99) - parseFloat(calcAvgGrade(b) ?? 99)
    );
  }
  if (sortKey === 'avg_desc') {
    return copy.sort((a, b) =>
      parseFloat(calcAvgGrade(b) ?? 0) - parseFloat(calcAvgGrade(a) ?? 0)
    );
  }
  return copy.sort((a, b) => b.weak_count - a.weak_count);
};

export default function AlertStudentsPage() {
  const [exams,         setExams]         = useState([]);
  const [examName,      setExamName]      = useState('');
  const [threshold,     setThreshold]     = useState(4);
  const [exploreMethod, setExploreMethod] = useState('avg');
  const [data,          setData]          = useState([]);
  const [filterBan,     setFilterBan]     = useState('전체');
  const [search,        setSearch]        = useState('');
  const [loaded,        setLoaded]        = useState(false);
  const [sortKey,       setSortKey]       = useState('default');

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
    if (!examName) return;
    const sessionId = getSessionId();  // ✅ session_id 가져오기
    const res = await api.get(
      `/analysis/alert-students?exam_name=${encodeURIComponent(examName)}&threshold=${threshold}&explore_method=${exploreMethod}&session_id=${sessionId}`  // ✅ session_id 추가
    );
    setData(res.data);
    setLoaded(true);
    setFilterBan('전체');
    setSearch('');
    setSortKey('default');
  };

  const bans = ['전체', ...[...new Set(data.map(s => s.ban))].sort((a, b) => a - b)];

  const filtered = sortData(
    data.filter(s => {
      const banOk  = filterBan === '전체' || s.ban === Number(filterBan);
      const nameOk = s.name.includes(search);
      return banOk && nameOk;
    }),
    sortKey
  );

  const exploreGrade = (s) => {
    if (exploreMethod === 'avg')   return s.explore_avg;
    if (exploreMethod === 'best')  return s.explore_best;
    if (exploreMethod === 'worst') return s.explore_worst;
    return s.explore_grade;
  };

  const exploreLabel = EXPLORE_OPTIONS.find(o => o.value === exploreMethod)?.label ?? '';

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚠️ 특이 학생 감지</h2>

      {/* ── 설정 카드 ── */}
      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>시험 선택</label>
            <select style={styles.select} value={examName}
              onChange={e => setExamName(e.target.value)}>
              <option value="">선택</option>
              {(Array.isArray(exams) ? exams : []).map(e => (
                <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              위기 기준 등급
              <span style={styles.labelSub}> (해당 등급 이상이면 위험)</span>
            </label>
            <select style={styles.select} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}>
              {[3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}등급 이상</option>
              ))}
            </select>
          </div>

          <button style={styles.btn} onClick={load}>조회</button>
        </div>

        {/* 탐구 방식 선택 */}
        <div style={styles.exploreRow}>
          <span style={styles.exploreRowLabel}>탐구 영역 적용 방식</span>
          <div style={styles.exploreBtns}>
            {EXPLORE_OPTIONS.map(o => (
              <button key={o.value} style={{
                ...styles.exploreBtn,
                ...(exploreMethod === o.value ? styles.exploreBtnActive : {})
              }} onClick={() => setExploreMethod(o.value)}>
                <span style={styles.exploreBtnLabel}>{o.label}</span>
                <span style={styles.exploreBtnDesc}>{o.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loaded && (
        <>
          {/* ── 요약 배너 ── */}
          <div style={styles.summaryBanner}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryNum}>{data.length}</span>
              <span style={styles.summaryTxt}>위기 학생 수</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryNum}>{threshold}등급</span>
              <span style={styles.summaryTxt}>기준 등급</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryNum}>{exploreLabel}</span>
              <span style={styles.summaryTxt}>탐구 방식</span>
            </div>
          </div>

          {/* ── 필터 + 정렬 ── */}
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

            <input
              placeholder="이름 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />

            <div style={styles.sortBtns}>
              {SORT_OPTIONS.map(o => (
                <button key={o.value} style={{
                  ...styles.sortBtn,
                  ...(sortKey === o.value ? styles.sortBtnActive : {})
                }} onClick={() => setSortKey(o.value)} title={o.desc}>
                  {o.label}
                </button>
              ))}
            </div>

            <span style={styles.count}>{filtered.length}명</span>
          </div>

          {/* ── 테이블 ── */}
          {filtered.length === 0 ? (
            <div style={styles.emptyBox}>
              ✅ 해당 조건의 위기 학생이 없습니다
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>반</th>
                    <th style={styles.th}>번호</th>
                    <th style={styles.th}>이름</th>
                    <th style={styles.th}>국어</th>
                    <th style={styles.th}>수학</th>
                    <th style={styles.th}>영어</th>
                    <th style={styles.th}>통합사회</th>
                    <th style={styles.th}>통합과학</th>
                    <th style={styles.th}>
                      탐구 합산<br />
                      <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'normal' }}>
                        {EXPLORE_OPTIONS.find(o => o.value === exploreMethod)?.desc}
                      </span>
                    </th>
                    <th style={styles.th}>한국사</th>
                    <th style={styles.th}>
                      평균 내신<br />
                      <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'normal' }}>
                        한국사 제외
                      </span>
                    </th>
                    <th style={styles.th}>위험 과목</th>
                    <th style={styles.th}>위험 수</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => {
                    const eg = exploreGrade(s);
                    const exploreAlert = eg != null && eg >= threshold;
                    const avg  = calcAvgGrade(s);
                    const avgC = avgGradeColor(avg);
                    return (
                      <tr key={i} style={{
                        background: s.weak_count >= 3 ? '#fff1f2'
                                  : s.weak_count === 2 ? '#fffbeb'
                                  : i % 2 === 0 ? 'white' : '#f9fafb'
                      }}>
                        <td style={styles.td}>{s.ban}</td>
                        <td style={styles.td}>{s.number}</td>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{s.name}</td>
                        <td style={{ ...styles.td, ...(s.korean_grade  >= threshold ? styles.alertCell : {}) }}>
                          <GradeChip grade={s.korean_grade} />
                        </td>
                        <td style={{ ...styles.td, ...(s.math_grade    >= threshold ? styles.alertCell : {}) }}>
                          <GradeChip grade={s.math_grade} />
                        </td>
                        <td style={{ ...styles.td, ...(s.english_grade >= threshold ? styles.alertCell : {}) }}>
                          <GradeChip grade={s.english_grade} />
                        </td>
                        <td style={styles.td}>
                          <GradeChip grade={s.society_grade} />
                        </td>
                        <td style={styles.td}>
                          <GradeChip grade={s.science_grade} />
                        </td>
                        <td style={{ ...styles.td, ...(exploreAlert ? styles.alertCell : {}) }}>
                          <GradeChip grade={eg} />
                          <div style={styles.exploreMini}>
                            <span>평균 {s.explore_avg   ?? '-'}</span>
                            <span>유리 {s.explore_best  ?? '-'}</span>
                            <span>불리 {s.explore_worst ?? '-'}</span>
                          </div>
                        </td>
                        <td style={styles.td}>{s.history_grade ?? '-'}</td>
                        <td style={styles.td}>
                          {avg != null ? (
                            <span style={{
                              ...styles.gradeChip,
                              background: avgC.bg,
                              color:      avgC.color,
                            }}>
                              {avg}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ ...styles.td, maxWidth: '160px' }}>
                          <div style={styles.weakTags}>
                            {s.weak_subjects.map((subj, j) => (
                              <span key={j} style={styles.weakTag}>{subj}</span>
                            ))}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.weakCount,
                            background: s.weak_count >= 3 ? '#fee2e2'
                                      : s.weak_count === 2 ? '#fef9c3'
                                      : '#f3f4f6',
                            color: s.weak_count >= 3 ? '#991b1b'
                                 : s.weak_count === 2 ? '#854d0e'
                                 : '#374151',
                          }}>
                            {s.weak_count}개
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container:        { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  title:            { fontSize: '24px', color: '#1e40af', marginBottom: '16px' },
  card:             { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  row:              { display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' },
  field:            { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '180px' },
  label:            { fontSize: '13px', fontWeight: 'bold', color: '#374151' },
  labelSub:         { fontSize: '11px', color: '#9ca3af', fontWeight: 'normal' },
  select:           { padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' },
  btn:              { background: '#1e40af', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', alignSelf: 'flex-end' },
  exploreRow:       { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid #f3f4f6' },
  exploreRowLabel:  { fontSize: '13px', fontWeight: 'bold', color: '#374151', whiteSpace: 'nowrap' },
  exploreBtns:      { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  exploreBtn:       { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', borderRadius: '10px', border: '2px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', gap: '2px', minWidth: '140px' },
  exploreBtnActive: { border: '2px solid #1e40af', background: '#eff6ff' },
  exploreBtnLabel:  { fontSize: '13px', fontWeight: 'bold', color: '#374151' },
  exploreBtnDesc:   { fontSize: '11px', color: '#9ca3af' },
  summaryBanner:    { display: 'flex', alignItems: 'center', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '16px 24px', marginBottom: '16px', gap: '24px' },
  summaryItem:      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  summaryNum:       { fontSize: '22px', fontWeight: 'bold', color: '#1e40af' },
  summaryTxt:       { fontSize: '12px', color: '#6b7280' },
  summaryDivider:   { width: '1px', height: '40px', background: '#e5e7eb' },
  filterRow:        { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  banBtns:          { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  banBtn:           { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '13px' },
  banBtnActive:     { background: '#1e40af', color: 'white', border: '1px solid #1e40af' },
  searchInput:      { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' },
  sortBtns:         { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  sortBtn:          { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#374151' },
  sortBtnActive:    { background: '#7c3aed', color: 'white', border: '1px solid #7c3aed', fontWeight: 'bold' },
  count:            { color: '#6b7280', fontSize: '14px' },
  emptyBox:         { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '32px', textAlign: 'center', fontSize: '16px', color: '#065f46' },
  table:            { borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
  th:               { padding: '9px 7px', border: '1px solid #e5e7eb', background: '#eff6ff', textAlign: 'center', whiteSpace: 'nowrap' },
  td:               { padding: '7px', border: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  alertCell:        { background: '#fff1f2' },
  gradeChip:        { display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' },
  nullChip:         { display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', color: '#9ca3af', background: '#f3f4f6' },
  exploreMini:      { display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '4px', fontSize: '10px', color: '#9ca3af' },
  weakTags:         { display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'center' },
  weakTag:          { background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '8px', fontSize: '11px' },
  weakCount:        { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' },
};