import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const gradeColor = (g) => {
  if (!g) return {};
  if (g === 1) return { background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' };
  if (g === 2) return { background: '#fef3c7', color: '#92400e', fontWeight: 'bold' };
  if (g === 3) return { background: '#ecfdf5', color: '#065f46' };
  if (g >= 7)  return { background: '#f3f4f6', color: '#6b7280' };
  return {};
};

const calcExplore = (society, science, method) => {
  const grades = [society, science].filter(g => g != null);
  if (grades.length === 0) return null;
  if (grades.length === 1) return grades[0];
  if (method === 'avg')  return Math.round((grades[0] + grades[1]) / 2);
  if (method === 'best') return Math.min(...grades);
  return null;
};

const checkMinimum = (student, config) => {
  if (!config.enabled) return null;
  const societyEnabled = config.subjects.find(s => s.key === 'society')?.enabled;
  const scienceEnabled = config.subjects.find(s => s.key === 'science')?.enabled;
  const bothExplore    = societyEnabled && scienceEnabled;
  const exploreGrade   = bothExplore
    ? calcExplore(student.society_grade, student.science_grade, config.exploreMethod)
    : null;

  const pool = [];
  for (const s of config.subjects) {
    if (!s.enabled) continue;
    if (s.key === 'society' && bothExplore) continue;
    if (s.key === 'science' && bothExplore) {
      if (exploreGrade != null) pool.push(exploreGrade);
      continue;
    }
    const gradeMap = {
      korean:  student.korean_grade,
      math:    student.math_grade,
      english: student.english_grade,
      society: student.society_grade,
      science: student.science_grade,
    };
    const g = gradeMap[s.key];
    if (g != null) pool.push(g);
  }

  const N = config.subjectCount;
  const M = config.maxSum;

  if (pool.length < N) {
    return { ok: false, best: null, N, M, note: '데이터 부족' };
  }

  const getCombinations = (arr, n) => {
    if (n === 1) return arr.map(v => [v]);
    const result = [];
    for (let i = 0; i <= arr.length - n; i++) {
      const rest = getCombinations(arr.slice(i + 1), n - 1);
      rest.forEach(combo => result.push([arr[i], ...combo]));
    }
    return result;
  };

  const combos  = getCombinations(pool, N);
  const sums    = combos.map(c => c.reduce((a, b) => a + b, 0));
  const bestSum = Math.min(...sums);
  return { ok: bestSum <= M, best: bestSum, N, M, note: '' };
};

const EXPLORE_OPTIONS = [
  { value: 'avg',  label: '평균 (반올림)', desc: '(사회+과학)÷2 반올림' },
  { value: 'best', label: '유리한 과목',   desc: '둘 중 좋은 등급' },
];

export default function AllStudentsPage() {
  const [exams,        setExams]        = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [students,     setStudents]     = useState([]);
  const [filterBan,    setFilterBan]    = useState('전체');
  const [search,       setSearch]       = useState('');
  const [filterMin,    setFilterMin]    = useState('전체');
  const [minConfig, setMinConfig] = useState({
    enabled:       false,
    subjectCount:  2,
    maxSum:        5,
    exploreMethod: 'avg',
    subjects: [
      { key: 'korean',  label: '국어',     enabled: true },
      { key: 'math',    label: '수학',     enabled: true },
      { key: 'english', label: '영어',     enabled: true },
      { key: 'society', label: '통합사회', enabled: true },
      { key: 'science', label: '통합과학', enabled: true },
    ]
  });

  // ✅ session_id 가져오기
  const getSessionId = () => localStorage.getItem('session_id');

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
    const sessionId = getSessionId();  // ✅ session_id 가져오기
    const res = await api.get(
      `/analysis/all-students?exam_name=${encodeURIComponent(selectedExam)}&session_id=${sessionId}`  // ✅ session_id 추가
    );
    setStudents(res.data);
  };

  const bans = ['전체', ...[...new Set(students.map(s => s.ban))]
    .sort((a, b) => a - b)];

  const allFiltered = students.filter(s => {
    const banOk  = filterBan === '전체' || s.ban === Number(filterBan);
    const nameOk = s.name.includes(search);
    return banOk && nameOk;
  });

  const filtered = allFiltered.filter(s => {
    if (!minConfig.enabled || filterMin === '전체') return true;
    const r = checkMinimum(s, minConfig);
    if (filterMin === '충족')   return r?.ok === true;
    if (filterMin === '미충족') return r?.ok === false;
    return true;
  });

  const toggleSubject = (key) => {
    setMinConfig(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.key === key ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  const minStats = minConfig.enabled ? (() => {
    const results = allFiltered.map(s => checkMinimum(s, minConfig));
    const ok = results.filter(r => r?.ok).length;
    return { ok, fail: allFiltered.length - ok, total: allFiltered.length };
  })() : null;

  const societyOn   = minConfig.subjects.find(s => s.key === 'society')?.enabled;
  const scienceOn   = minConfig.subjects.find(s => s.key === 'science')?.enabled;
  const bothExplore = societyOn && scienceOn;
  const exploreDesc = EXPLORE_OPTIONS.find(o => o.value === minConfig.exploreMethod)?.desc ?? '';

  const savePDF = async () => {
    const el = document.getElementById('all-students-content');
    const canvas = await html2canvas(el, { scale: 1.5 });
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
    pdf.save(`전체학생_${selectedExam || '성적'}.pdf`);
  };

  const cols = [
    { label: '반',         key: 'ban' },
    { label: '번호',       key: 'number' },
    { label: '이름',       key: 'name' },
    { label: '국어표준',   key: 'korean_std' },
    { label: '국어백분위', key: 'korean_pct' },
    { label: '국어등급',   key: 'korean_grade',  isGrade: true },
    { label: '수학표준',   key: 'math_std' },
    { label: '수학백분위', key: 'math_pct' },
    { label: '수학등급',   key: 'math_grade',    isGrade: true },
    { label: '영어등급',   key: 'english_grade', isGrade: true },
    { label: '사회표준',   key: 'society_std' },
    { label: '사회백분위', key: 'society_pct' },
    { label: '사회등급',   key: 'society_grade', isGrade: true },
    { label: '과학표준',   key: 'science_std' },
    { label: '과학백분위', key: 'science_pct' },
    { label: '과학등급',   key: 'science_grade', isGrade: true },
    { label: '한국사등급', key: 'history_grade', isGrade: false },
  ];

  return (
    <div style={styles.container}>
      {/* ── 제목 + PDF ── */}
      <div style={styles.titleRow}>
        <h2 style={styles.title}>📋 전체 학생 성적</h2>
        {students.length > 0 && (
          <button style={styles.pdfBtn} onClick={savePDF}>📄 PDF 저장</button>
        )}
      </div>

      {/* ── 시험 선택 ── */}
      <div style={styles.row}>
        <select style={styles.select} value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}>
          <option value="">시험 선택</option>
          {(Array.isArray(exams) ? exams : []).map(e => (
            <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>
          ))}
        </select>
        <button style={styles.btn} onClick={load}>불러오기</button>
      </div>

      {/* ── 최저학력기준 설정 ── */}
      <div style={styles.card}>
        <div style={styles.minTopRow}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={minConfig.enabled}
              onChange={e => setMinConfig(p => ({ ...p, enabled: e.target.checked }))} />
            <b style={{ marginLeft: '6px' }}>최저학력기준 설정</b>
          </label>
        </div>

        {minConfig.enabled && (
          <div style={styles.minBody}>
            {/* N합 M 설정 */}
            <div style={styles.minSection}>
              <span style={styles.minLabel}>기준:</span>
              <div style={styles.nSumRow}>
                <input type="number" min={1} max={5}
                  value={minConfig.subjectCount}
                  onChange={e => setMinConfig(p => ({
                    ...p, subjectCount: Number(e.target.value)
                  }))}
                  style={styles.nInput}
                />
                <span style={styles.nText}>합</span>
                <input type="number" min={1} max={45}
                  value={minConfig.maxSum}
                  onChange={e => setMinConfig(p => ({
                    ...p, maxSum: Number(e.target.value)
                  }))}
                  style={styles.nInput}
                />
                <span style={styles.nText}>이하</span>
                <span style={styles.nExample}>
                  → 어떤 {minConfig.subjectCount}개 과목이든 등급 합이{' '}
                  {minConfig.maxSum} 이하면 충족
                </span>
              </div>
            </div>

            {/* 적용 과목 풀 */}
            <div style={styles.minSection}>
              <span style={styles.minLabel}>적용 과목:</span>
              <div style={styles.subjectRow}>
                {minConfig.subjects.map(s => (
                  <label key={s.key} style={{
                    ...styles.chip,
                    ...(s.enabled ? styles.chipOn : {})
                  }}>
                    <input type="checkbox" checked={s.enabled}
                      onChange={() => toggleSubject(s.key)}
                      style={{ display: 'none' }} />
                    {s.label}
                  </label>
                ))}
              </div>
              <span style={styles.poolDesc}>체크된 과목들 중 최적 조합으로 판단</span>
            </div>

            {/* 탐구 방식 */}
            {bothExplore && (
              <div style={styles.minSection}>
                <span style={styles.minLabel}>탐구 방식:</span>
                <div style={styles.exploreBtns}>
                  {EXPLORE_OPTIONS.map(o => (
                    <button key={o.value}
                      style={{
                        ...styles.exploreBtn,
                        ...(minConfig.exploreMethod === o.value
                          ? styles.exploreBtnActive : {})
                      }}
                      onClick={() => setMinConfig(p => ({
                        ...p, exploreMethod: o.value
                      }))}>
                      <span style={styles.exploreBtnLabel}>{o.label}</span>
                      <span style={styles.exploreBtnDesc}>{o.desc}</span>
                    </button>
                  ))}
                </div>
                <span style={styles.exploreNote}>
                  {minConfig.exploreMethod === 'avg'
                    ? '📌 사회2 + 과학3 → 평균 2.5 → 반올림 → 3등급 (1과목으로 계산)'
                    : '📌 사회2 + 과학3 → 유리한 2등급 채택 (1과목으로 계산)'}
                </span>
              </div>
            )}

            {/* 충족 필터 */}
            <div style={styles.minSection}>
              <span style={styles.minLabel}>보기 필터:</span>
              {['전체', '충족', '미충족'].map(f => (
                <button key={f} style={{
                  ...styles.filterChip,
                  ...(filterMin === f ? styles.filterChipOn : {})
                }} onClick={() => setFilterMin(f)}>
                  {f}
                </button>
              ))}
            </div>

            {/* 통계 */}
            {minStats && (
              <div style={styles.statsRow}>
                <span style={styles.okBadge}>✅ 충족 {minStats.ok}명</span>
                <span style={styles.failBadge}>❌ 미충족 {minStats.fail}명</span>
                <span style={styles.rateBadge}>
                  충족률 {minStats.total > 0
                    ? ((minStats.ok / minStats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 반 필터 + 검색 ── */}
      {students.length > 0 && (
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
          <span style={styles.count}>{filtered.length}명</span>
        </div>
      )}

      {/* ── 테이블 ── */}
      {filtered.length > 0 && (
        <div id="all-students-content" style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {minConfig.enabled && (
                  <th style={styles.th}>
                    최저충족<br />
                    <span style={{ fontSize: '10px', fontWeight: 'normal' }}>
                      ({minConfig.subjectCount}합{minConfig.maxSum}이하
                      {bothExplore ? ` / 탐구:${exploreDesc}` : ''})
                    </span>
                  </th>
                )}
                {cols.map(c => (
                  <th key={c.key} style={styles.th}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const r = checkMinimum(s, minConfig);
                return (
                  <tr key={i} style={i % 2 === 0 ? {} : { background: '#f9fafb' }}>
                    {minConfig.enabled && (
                      <td style={{
                        ...styles.td,
                        background:  r?.ok ? '#d1fae5' : '#fee2e2',
                        color:       r?.ok ? '#065f46' : '#991b1b',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}>
                        {r?.note
                          ? `⚠️ ${r.note}`
                          : r?.ok
                            ? `✅ ${r.N}합${r.best}`
                            : `❌ ${r.N}합${r.best}`}
                      </td>
                    )}
                    {cols.map(c => (
                      <td key={c.key} style={{
                        ...styles.td,
                        ...(c.isGrade ? gradeColor(s[c.key]) : {})
                      }}>
                        {s[c.key] ?? '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container:        { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  titleRow:         { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title:            { fontSize: '24px', color: '#1e40af', margin: 0 },
  pdfBtn:           { background: '#dc2626', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  row:              { display: 'flex', gap: '12px', marginBottom: '16px' },
  select:           { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' },
  btn:              { background: '#1e40af', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' },
  card:             { background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  minTopRow:        { display: 'flex', alignItems: 'center' },
  checkLabel:       { display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '15px' },
  minBody:          { marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' },
  minSection:       { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  minLabel:         { fontSize: '14px', fontWeight: 'bold', color: '#374151', minWidth: '80px' },
  nSumRow:          { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  nInput:           { width: '60px', padding: '6px 8px', border: '2px solid #1e40af', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', color: '#1e40af' },
  nText:            { fontSize: '16px', fontWeight: 'bold', color: '#1e40af' },
  nExample:         { fontSize: '12px', color: '#6b7280', marginLeft: '4px' },
  subjectRow:       { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  chip:             { padding: '4px 12px', borderRadius: '20px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: '13px', userSelect: 'none' },
  chipOn:           { background: '#1e40af', color: 'white', border: '1px solid #1e40af', fontWeight: 'bold' },
  poolDesc:         { fontSize: '12px', color: '#9ca3af' },
  exploreBtns:      { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  exploreBtn:       { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 16px', borderRadius: '10px', border: '2px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', gap: '2px', minWidth: '130px' },
  exploreBtnActive: { border: '2px solid #1e40af', background: '#eff6ff' },
  exploreBtnLabel:  { fontSize: '13px', fontWeight: 'bold', color: '#374151' },
  exploreBtnDesc:   { fontSize: '11px', color: '#9ca3af' },
  exploreNote:      { fontSize: '12px', color: '#6b7280', background: '#f9fafb', padding: '4px 10px', borderRadius: '8px' },
  filterChip:       { padding: '4px 14px', borderRadius: '20px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '13px' },
  filterChipOn:     { background: '#1e40af', color: 'white', border: '1px solid #1e40af', fontWeight: 'bold' },
  statsRow:         { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  okBadge:          { background: '#d1fae5', color: '#065f46', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' },
  failBadge:        { background: '#fee2e2', color: '#991b1b', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' },
  rateBadge:        { background: '#eff6ff', color: '#1e40af', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' },
  filterRow:        { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  banBtns:          { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  banBtn:           { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '13px' },
  banBtnActive:     { background: '#1e40af', color: 'white', border: '1px solid #1e40af' },
  searchInput:      { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' },
  count:            { color: '#6b7280', fontSize: '14px' },
  tableWrap:        { overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  table:            { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:               { padding: '10px 8px', border: '1px solid #e5e7eb', background: '#eff6ff', whiteSpace: 'nowrap', textAlign: 'center' },
  td:               { padding: '7px 8px', border: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap' },
};