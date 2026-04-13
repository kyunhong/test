import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LabelList, LineChart, Line,
} from 'recharts';

const SUBJECTS = [
  { key: 'korean',  label: '국어' },
  { key: 'math',    label: '수학' },
  { key: 'english', label: '영어' },
  { key: 'society', label: '통합사회' },
  { key: 'science', label: '통합과학' },
  { key: 'history', label: '한국사' },
];

const GRADE_COLORS = [
  '#1e40af', '#3b82f6', '#10b981', '#84cc16', '#eab308',
  '#f97316', '#ef4444', '#dc2626', '#991b1b',
];

const diffStyle = (val) => {
  if (val == null) return {};
  if (val > 0) return { color: '#059669', fontWeight: 'bold' };
  if (val < 0) return { color: '#dc2626', fontWeight: 'bold' };
  return { color: '#6b7280' };
};

const diffText = (val, isGrade = false) => {
  if (val == null) return '-';
  if (isGrade) {
    if (val > 0) return `▲${val}`;
    if (val < 0) return `▼${Math.abs(val)}`;
    return '→';
  }
  if (val > 0) return `+${val}`;
  if (val < 0) return `${val}`;
  return '0';
};

const DiffBadge = ({ curr, prev }) => {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  if (diff === 0) return <span style={badge.neutral}>→ 동일</span>;
  if (diff > 0)   return <span style={badge.up}>▲ +{diff}명</span>;
  return           <span style={badge.down}>▼ {diff}명</span>;
};

const badge = {
  up:      { background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginLeft: '6px' },
  down:    { background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', marginLeft: '6px' },
  neutral: { background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', marginLeft: '6px' },
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb',
      padding: '10px 14px', borderRadius: '8px',
      fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill, margin: '2px 0' }}>
          {p.name}: {p.value}명
        </p>
      ))}
      {payload.length === 2 && (
        <p style={{
          borderTop: '1px solid #e5e7eb', marginTop: '6px', paddingTop: '6px',
          color: payload[1].value - payload[0].value >= 0 ? '#059669' : '#dc2626',
          fontWeight: 'bold',
        }}>
          변화: {payload[1].value - payload[0].value >= 0 ? '+' : ''}
          {payload[1].value - payload[0].value}명
        </p>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════
// 꺾은선 차트
// ══════════════════════════════════════════════════
const AreaDiffChart = ({ distData, subjectLabel }) => {
  const [hovered, setHovered] = useState(null);
  if (!distData) return null;

  const chartData = Array.from({ length: 9 }, (_, i) => ({
    grade: `${i + 1}등급`,
    이전:  distData.prev_dist[i + 1] ?? 0,
    현재:  distData.curr_dist[i + 1] ?? 0,
    diff:  (distData.curr_dist[i + 1] ?? 0) - (distData.prev_dist[i + 1] ?? 0),
  }));

  const maxVal = Math.max(...chartData.flatMap(d => [d.이전, d.현재]), 1);
  const yMax   = Math.ceil(maxVal / 5) * 5 || 10;

  const CustomDot = (props) => {
    const { cx, cy, payload, dataKey } = props;
    const isHov = hovered === payload.grade;
    const color = dataKey === '이전' ? '#2f03cf' : '#ff0000';
    return (
      <circle cx={cx} cy={cy} r={isHov ? 7 : 4}
        fill={color} stroke="white" strokeWidth={2}
        style={{ transition: 'r 0.15s' }} />
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const prev = payload.find(p => p.dataKey === '이전')?.value ?? 0;
    const curr = payload.find(p => p.dataKey === '현재')?.value ?? 0;
    const diff = curr - prev;
    return (
      <div style={{
        background: 'white', border: '1px solid #e5e7eb',
        padding: '10px 14px', borderRadius: '8px',
        fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '6px', color: '#1e40af' }}>{label}</p>
        <p style={{ color: '#2f03cf', margin: '2px 0' }}>이전: {prev}명</p>
        <p style={{ color: '#ff0000', margin: '2px 0' }}>현재: {curr}명</p>
        <p style={{
          borderTop: '1px solid #e5e7eb', marginTop: '6px', paddingTop: '6px',
          fontWeight: 'bold',
          color: diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#6b7280',
        }}>
          {diff > 0 ? `▲ +${diff}명 증가` : diff < 0 ? `▼ ${diff}명 감소` : '→ 동일'}
        </p>
      </div>
    );
  };

  const upCount   = chartData.filter(d => d.diff > 0).length;
  const downCount = chartData.filter(d => d.diff < 0).length;
  const sameCount = chartData.filter(d => d.diff === 0).length;

  return (
    <div style={styles.distSubjectCard}>
      <div style={styles.distSubjectTitle}>{subjectLabel}</div>
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
          onMouseMove={e => { if (e?.activeLabel) setHovered(e.activeLabel); }}
          onMouseLeave={() => setHovered(null)}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="grade" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis allowDecimals={false} domain={[0, yMax]} tick={{ fontSize: 10 }} width={24} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="이전" stroke="#2f03cf" strokeWidth={2} strokeDasharray="5 3" dot={<CustomDot />} activeDot={false} />
          <Line type="monotone" dataKey="현재" stroke="#ff0000" strokeWidth={2.5} dot={<CustomDot />} activeDot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ marginTop: '8px', padding: '0 4px' }}>
        {chartData.map(d => (
          <div key={d.grade} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontSize: '10px', color: '#6b7280', minWidth: '36px', textAlign: 'right' }}>{d.grade}</span>
            <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              {d.diff !== 0 && (
                <div style={{
                  position: 'absolute',
                  left: d.diff > 0 ? '50%' : `calc(50% - ${Math.min(Math.abs(d.diff) / maxVal * 50, 50)}%)`,
                  width: `${Math.min(Math.abs(d.diff) / maxVal * 50, 50)}%`,
                  height: '100%',
                  background: d.diff > 0 ? '#10b981' : '#ef4444',
                  borderRadius: '4px',
                }} />
              )}
              <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: '#d1d5db' }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 'bold', minWidth: '28px', color: d.diff > 0 ? '#059669' : d.diff < 0 ? '#dc2626' : '#9ca3af' }}>
              {d.diff > 0 ? `+${d.diff}` : d.diff === 0 ? '→' : d.diff}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
//        {upCount > 0 && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '8px', background: '#d1fae5', color: '#065f46', fontWeight: 'bold' }}>▲ {upCount}개 증가</span>}
//        {downCount > 0 && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }}>▼ {downCount}개 감소</span>}
//        {sameCount > 0 && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '8px', background: '#f3f4f6', color: '#6b7280' }}>→ {sameCount}개 동일</span>}
// ══════════════════════════════════════════════════
// 히트맵
// ══════════════════════════════════════════════════
const GradeHeatmap = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const allDiffs = [];
  SUBJECTS.forEach(s => {
    const d = data.grade_dist_compare[s.key];
    if (!d) return;
    for (let g = 1; g <= 9; g++) {
      allDiffs.push(Math.abs((d.curr_dist[g] ?? 0) - (d.prev_dist[g] ?? 0)));
    }
  });
  const maxAbs = Math.max(...allDiffs, 1);

  const cellBg = (diff) => {
    if (diff === 0) return '#f9fafb';
    const intensity = Math.min(Math.abs(diff) / maxAbs, 1);
    if (diff > 0) {
      const r = Math.round(240 - intensity * 180);
      const g = Math.round(250 - intensity * 100);
      return `rgb(${r}, ${g}, ${Math.round(230 - intensity * 150)})`;
    } else {
      const r = Math.round(250 - intensity * 50);
      const g = Math.round(240 - intensity * 180);
      return `rgb(${r}, ${g}, ${g})`;
    }
  };

  const cellTextColor = (diff) => {
    if (diff === 0) return '#9ca3af';
    const intensity = Math.min(Math.abs(diff) / maxAbs, 1);
    return intensity > 0.5
      ? (diff > 0 ? '#064e3b' : '#7f1d1d')
      : (diff > 0 ? '#065f46' : '#991b1b');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          셀 = 현재 인원 / 아래 숫자 = 변화량 &nbsp;|&nbsp;
          <span style={{ color: '#059669', fontWeight: 'bold' }}>초록 ↑ 증가</span>
          &nbsp;/&nbsp;
          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>빨강 ↓ 감소</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#dc2626' }}>감소</span>
          <div style={{ width: '80px', height: '10px', borderRadius: '4px', background: 'linear-gradient(to right, #fca5a5, #f9fafb, #6ee7b7)' }} />
          <span style={{ fontSize: '11px', color: '#059669' }}>증가</span>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '3px', fontSize: '12px', width: '100%' }}>
          <thead>
            <tr>
              <th style={hmStyles.th}>과목</th>
              {Array.from({ length: 9 }, (_, i) => (
                <th key={i} style={{ ...hmStyles.th, color: GRADE_COLORS[i], minWidth: '72px' }}>{i + 1}등급</th>
              ))}
              <th style={hmStyles.th}>상위변화<br />(1~2)</th>
              <th style={hmStyles.th}>하위변화<br />(7~9)</th>
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map(s => {
              const d = data.grade_dist_compare[s.key];
              if (!d) return null;
              const prevTop = (d.prev_dist[1] ?? 0) + (d.prev_dist[2] ?? 0);
              const currTop = (d.curr_dist[1] ?? 0) + (d.curr_dist[2] ?? 0);
              const prevLow = (d.prev_dist[7] ?? 0) + (d.prev_dist[8] ?? 0) + (d.prev_dist[9] ?? 0);
              const currLow = (d.curr_dist[7] ?? 0) + (d.curr_dist[8] ?? 0) + (d.curr_dist[9] ?? 0);
              const topDiff = currTop - prevTop;
              const lowDiff = currLow - prevLow;
              return (
                <tr key={s.key}>
                  <td style={hmStyles.subjectTd}>{s.label}</td>
                  {Array.from({ length: 9 }, (_, i) => {
                    const g    = i + 1;
                    const prev = d.prev_dist[g] ?? 0;
                    const curr = d.curr_dist[g] ?? 0;
                    const diff = curr - prev;
                    const isHov = hovered?.subjectKey === s.key && hovered?.grade === g;
                    return (
                      <td key={g} style={{
                        ...hmStyles.cell,
                        background: isHov ? '#eff6ff' : cellBg(diff),
                        color: cellTextColor(diff),
                        border: isHov ? '2px solid #1e40af' : '2px solid transparent',
                        transform: isHov ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.15s', cursor: 'default',
                      }}
                        onMouseEnter={() => setHovered({ subjectKey: s.key, grade: g })}
                        onMouseLeave={() => setHovered(null)}
                        title={`${s.label} ${g}등급\n이전: ${prev}명 → 현재: ${curr}명\n변화: ${diff > 0 ? '+' : ''}${diff}명`}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{curr}</div>
                        <div style={{ fontSize: '10px', marginTop: '1px' }}>
                          {diff === 0 ? '→' : diff > 0 ? `+${diff}` : `${diff}`}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ ...hmStyles.summaryCell, background: topDiff > 0 ? '#d1fae5' : topDiff < 0 ? '#fee2e2' : '#f9fafb', color: topDiff > 0 ? '#065f46' : topDiff < 0 ? '#991b1b' : '#9ca3af' }}>
                    <div style={{ fontWeight: 'bold' }}>{currTop}명</div>
                    <div style={{ fontSize: '11px' }}>{topDiff > 0 ? `+${topDiff}` : topDiff === 0 ? '→' : topDiff}</div>
                  </td>
                  <td style={{ ...hmStyles.summaryCell, background: lowDiff < 0 ? '#d1fae5' : lowDiff > 0 ? '#fee2e2' : '#f9fafb', color: lowDiff < 0 ? '#065f46' : lowDiff > 0 ? '#991b1b' : '#9ca3af' }}>
                    <div style={{ fontWeight: 'bold' }}>{currLow}명</div>
                    <div style={{ fontSize: '11px' }}>{lowDiff > 0 ? `+${lowDiff}` : lowDiff === 0 ? '→' : lowDiff}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const hmStyles = {
  th:          { padding: '8px 6px', background: '#f1f5f9', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#374151', borderRadius: '6px', whiteSpace: 'nowrap' },
  subjectTd:   { padding: '6px 10px', fontWeight: 'bold', color: '#1e40af', fontSize: '13px', background: '#eff6ff', borderRadius: '6px', textAlign: 'center', whiteSpace: 'nowrap' },
  cell:        { padding: '6px 4px', borderRadius: '8px', textAlign: 'center', minWidth: '52px' },
  summaryCell: { padding: '6px 8px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', minWidth: '60px' },
};

// ══════════════════════════════════════════════════
// 등급 이동 매트릭스
// ══════════════════════════════════════════════════
const MigrationMatrix = ({ students, subjectKey, subjectLabel }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [modalData,   setModalData]   = useState(null);

  // ✅ diff = 이전 - 현재  →  이전 = 현재 + diff
  const getPrevGrade = (s, key) => {
    const curr = s[`${key}_grade`];
    const diff = s[`diff_${key}_grade`];
    if (curr == null || diff == null) return null;
    const prev = curr + diff;
    return prev >= 1 && prev <= 9 ? prev : null;
  };

  const validStudents = students.filter(s =>
    s.has_prev &&
    getPrevGrade(s, subjectKey) != null &&
    s[`${subjectKey}_grade`] != null
  );

  const matrix = {};
  for (let p = 1; p <= 9; p++) {
    matrix[p] = {};
    for (let c = 1; c <= 9; c++) matrix[p][c] = [];
  }

  validStudents.forEach(s => {
    const prevGrade = getPrevGrade(s, subjectKey);
    const currGrade = s[`${subjectKey}_grade`];
    if (prevGrade && currGrade) {
      matrix[prevGrade][currGrade].push({ ...s, prevGrade, currGrade });
    }
  });

  const rowTotal = (p) => Object.values(matrix[p]).reduce((sum, arr) => sum + arr.length, 0);
  const colTotal = (c) => Object.keys(matrix).reduce((sum, p) => sum + matrix[p][c].length, 0);

  const cellBg = (prevG, currG, count) => {
    if (count === 0) return '#f9fafb';
    const maxCount = Math.max(...Object.values(matrix).flatMap(row => Object.values(row).map(arr => arr.length)), 1);
    const intensity = Math.min(count / maxCount, 1);
    if (prevG === currG) return `rgba(59, 130, 246, ${0.15 + intensity * 0.5})`;
    if (currG < prevG)   return `rgba(16, 185, 129, ${0.15 + intensity * 0.5})`;
    return                      `rgba(239, 68,  68,  ${0.15 + intensity * 0.5})`;
  };

  const cellTextColor = (prevG, currG) => {
    if (prevG === currG) return '#1e40af';
    if (currG < prevG)   return '#065f46';
    return '#991b1b';
  };

  const improved   = validStudents.filter(s => s[`${subjectKey}_grade`] < getPrevGrade(s, subjectKey)).length;
  const maintained = validStudents.filter(s => s[`${subjectKey}_grade`] === getPrevGrade(s, subjectKey)).length;
  const declined   = validStudents.filter(s => s[`${subjectKey}_grade`] > getPrevGrade(s, subjectKey)).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ ...mmStyles.summBadge, background: '#d1fae5', color: '#065f46' }}>📈 향상 {improved}명</div>
        <div style={{ ...mmStyles.summBadge, background: '#eff6ff', color: '#1e40af' }}>→ 유지 {maintained}명</div>
        <div style={{ ...mmStyles.summBadge, background: '#fee2e2', color: '#991b1b' }}>📉 하락 {declined}명</div>
        <div style={{ ...mmStyles.summBadge, background: '#f3f4f6', color: '#6b7280' }}>전체 {validStudents.length}명</div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(59,130,246,0.5)', label: '대각선 = 등급 유지' },
          { color: 'rgba(16,185,129,0.5)', label: '우상단 = 등급 향상' },
          { color: 'rgba(239,68,68,0.5)',  label: '좌하단 = 등급 하락' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: color }} />
            <span style={{ fontSize: '11px', color: '#374151' }}>{label}</span>
          </div>
        ))}
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>셀 클릭 → 해당 학생 명단</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '2px', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={mmStyles.cornerTh} colSpan={2} rowSpan={2}>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>이전↓ / 현재→</div>
              </th>
              <th style={{ ...mmStyles.headerTh, color: '#374151', fontSize: '11px' }} colSpan={9}>현재 등급</th>
              <th style={mmStyles.headerTh}>합계</th>
            </tr>
            <tr>
              {Array.from({ length: 9 }, (_, i) => (
                <th key={i} style={{ ...mmStyles.headerTh, color: GRADE_COLORS[i] }}>{i + 1}등급</th>
              ))}
              <th style={mmStyles.headerTh} />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 9 }, (_, pi) => {
              const p     = pi + 1;
              const total = rowTotal(p);
              if (total === 0) return null;
              return (
                <tr key={p}>
                  {pi === 0 && (
                    <td style={{
                      ...mmStyles.sideHeader,
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                    }} rowSpan={9}>이전 등급</td>
                  )}
                  <td style={{ ...mmStyles.headerTh, color: GRADE_COLORS[pi] }}>{p}등급</td>
                  {Array.from({ length: 9 }, (_, ci) => {
                    const c     = ci + 1;
                    const arr   = matrix[p][c];
                    const count = arr.length;
                    const isHov = hoveredCell?.p === p && hoveredCell?.c === c;
                    return (
                      <td key={c}
                        style={{
                          ...mmStyles.cell,
                          background: isHov ? '#fef3c7' : cellBg(p, c, count),
                          color:      count === 0 ? '#d1d5db' : cellTextColor(p, c),
                          fontWeight: count > 0 ? 'bold' : 'normal',
                          cursor:     count > 0 ? 'pointer' : 'default',
                          border:     isHov ? '2px solid #f59e0b' : '2px solid transparent',
                          transform:  isHov ? 'scale(1.08)' : 'scale(1)',
                          transition: 'all 0.12s',
                          outline:    p === c ? '2px solid rgba(59,130,246,0.3)' : 'none',
                        }}
                        onMouseEnter={() => count > 0 && setHoveredCell({ p, c })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => count > 0 && setModalData({ prevGrade: p, currGrade: c, students: arr })}
                        title={count > 0 ? `이전 ${p}등급 → 현재 ${c}등급: ${count}명` : ''}
                      >
                        {count > 0 ? count : ''}
                      </td>
                    );
                  })}
                  <td style={{ ...mmStyles.totalCell, color: '#374151' }}>{total}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} style={{ ...mmStyles.headerTh, textAlign: 'center' }}>합계</td>
              {Array.from({ length: 9 }, (_, ci) => (
                <td key={ci} style={{ ...mmStyles.totalCell, color: GRADE_COLORS[ci] }}>
                  {colTotal(ci + 1) || ''}
                </td>
              ))}
              <td style={{ ...mmStyles.totalCell, color: '#1e40af', fontWeight: 'bold' }}>
                {validStudents.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {modalData && (
        <div style={mmStyles.modalOverlay} onClick={() => setModalData(null)}>
          <div style={mmStyles.modal} onClick={e => e.stopPropagation()}>
            <div style={mmStyles.modalHeader}>
              <div>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af' }}>{subjectLabel}</span>
                <span style={{ fontSize: '14px', color: '#374151', marginLeft: '8px' }}>
                  이전 {modalData.prevGrade}등급 → 현재 {modalData.currGrade}등급
                </span>
                <span style={{
                  marginLeft: '8px', fontSize: '13px', fontWeight: 'bold',
                  color: modalData.currGrade < modalData.prevGrade ? '#059669'
                       : modalData.currGrade > modalData.prevGrade ? '#dc2626' : '#1e40af',
                }}>
                  {modalData.currGrade < modalData.prevGrade ? '📈 향상'
                   : modalData.currGrade > modalData.prevGrade ? '📉 하락' : '→ 유지'}
                </span>
              </div>
              <button style={mmStyles.modalClose} onClick={() => setModalData(null)}>✕</button>
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>총 {modalData.students.length}명</div>
            <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={mmStyles.modalTh}>반</th>
                    <th style={mmStyles.modalTh}>번호</th>
                    <th style={mmStyles.modalTh}>이름</th>
                    <th style={mmStyles.modalTh}>이전 등급</th>
                    <th style={mmStyles.modalTh}>현재 등급</th>
                    <th style={mmStyles.modalTh}>변화</th>
                  </tr>
                </thead>
                <tbody>
                  {[...modalData.students]
                    .sort((a, b) => a.ban - b.ban || a.number - b.number)
                    .map((s, i) => {
                      const diff = modalData.currGrade - modalData.prevGrade;
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={mmStyles.modalTd}>{s.ban}반</td>
                          <td style={mmStyles.modalTd}>{s.number}번</td>
                          <td style={{ ...mmStyles.modalTd, fontWeight: 'bold' }}>{s.name}</td>
                          <td style={{ ...mmStyles.modalTd, color: GRADE_COLORS[modalData.prevGrade - 1] }}>{modalData.prevGrade}등급</td>
                          <td style={{ ...mmStyles.modalTd, color: GRADE_COLORS[modalData.currGrade - 1] }}>{modalData.currGrade}등급</td>
                          <td style={{ ...mmStyles.modalTd, fontWeight: 'bold', color: diff < 0 ? '#059669' : diff > 0 ? '#dc2626' : '#1e40af' }}>
                            {diff < 0 ? `▲ ${Math.abs(diff)}등급 향상` : diff > 0 ? `▼ ${diff}등급 하락` : '→ 유지'}
                          </td>
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
};

const mmStyles = {
  summBadge:    { padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' },
  cornerTh:     { padding: '8px', background: '#f8fafc', border: '1px solid #e5e7eb', fontSize: '11px', textAlign: 'center', minWidth: '60px' },
  headerTh:     { padding: '7px 6px', background: '#f1f5f9', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  sideHeader:   { padding: '6px 4px', background: '#f1f5f9', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#374151' },
  cell:         { padding: '8px 6px', border: '1px solid #f3f4f6', textAlign: 'center', minWidth: '44px', fontSize: '13px', borderRadius: '4px' },
  totalCell:    { padding: '7px 6px', background: '#f8fafc', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:        { background: 'white', borderRadius: '16px', padding: '24px', minWidth: '480px', maxWidth: '640px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  modalClose:   { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280', padding: '4px 8px' },
  modalTh:      { padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#374151', fontSize: '12px' },
  modalTd:      { padding: '8px 10px', textAlign: 'center', borderTop: '1px solid #f3f4f6', fontSize: '13px' },
};

// ══════════════════════════════════════════════════
// 이탈/진입 카드
// ══════════════════════════════════════════════════
const MigrationCards = ({ students, prevExam, currExam }) => {
  const [selectedSubject, setSelectedSubject] = useState('korean');
  const [activeTab,       setActiveTab]       = useState('exited');
  const [search,          setSearch]          = useState('');

  const getPrevGrade = (s, key) => {
    const curr = s[`${key}_grade`];
    const diff = s[`diff_${key}_grade`];
    if (curr == null || diff == null) return null;
    const prev = curr + diff;
    return prev >= 1 && prev <= 9 ? prev : null;
  };

  const validStudents = students.filter(s => s.has_prev);

  const getZone = (g) => {
    if (!g) return null;
    if (g <= 2) return 'top';
    if (g <= 6) return 'mid';
    return 'low';
  };

  const getSubjectData = (subjectKey) => {
    const exited  = [];
    const entered = [];
    const risk    = [];
    validStudents.forEach(s => {
      const prevGrade = getPrevGrade(s, subjectKey);
      const currGrade = s[`${subjectKey}_grade`];
      if (!prevGrade || !currGrade) return;
      const prevZone = getZone(prevGrade);
      const currZone = getZone(currGrade);
      const item = { ...s, prevGrade, currGrade, diff: prevGrade - currGrade };
      if (prevZone === 'top' && currZone !== 'top') exited.push(item);
      if (prevZone !== 'top' && currZone === 'top') entered.push(item);
      if (prevZone === 'mid' && currZone === 'low') risk.push(item);
    });
    return { exited, entered, risk };
  };

  const subjectData  = getSubjectData(selectedSubject);
  const currentList  = subjectData[activeTab] ?? [];
  const filteredList = currentList.filter(s =>
    s.name.includes(search) || String(s.ban).includes(search)
  );

  const allSubjectSummary = SUBJECTS.map(s => {
    const d = getSubjectData(s.key);
    return { ...s, exited: d.exited.length, entered: d.entered.length, risk: d.risk.length };
  });

  const tabConfig = {
    exited:  { label: '📉 상위권 이탈', color: '#dc2626', bg: '#fee2e2', desc: '이전 1~2등급 → 현재 3등급 이하' },
    entered: { label: '📈 상위권 진입', color: '#059669', bg: '#d1fae5', desc: '이전 3등급 이하 → 현재 1~2등급' },
    risk:    { label: '⚠️ 위험군',      color: '#d97706', bg: '#fef3c7', desc: '이전 중위권(3~6) → 현재 하위권(7~9)' },
  };

  return (
    <div>
      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={mcStyles.th}>과목</th>
              <th style={{ ...mcStyles.th, color: '#dc2626' }}>📉 상위권 이탈</th>
              <th style={{ ...mcStyles.th, color: '#059669' }}>📈 상위권 진입</th>
              <th style={{ ...mcStyles.th, color: '#d97706' }}>⚠️ 위험군</th>
              <th style={mcStyles.th}>순효과</th>
            </tr>
          </thead>
          <tbody>
            {allSubjectSummary.map((s, i) => {
              const net = s.entered - s.exited;
              return (
                <tr key={s.key}
                  style={{ background: selectedSubject === s.key ? '#eff6ff' : i % 2 === 0 ? 'white' : '#f9fafb', cursor: 'pointer' }}
                  onClick={() => setSelectedSubject(s.key)}
                >
                  <td style={{ ...mcStyles.td, fontWeight: 'bold', color: '#1e40af' }}>{s.label}</td>
                  <td style={{ ...mcStyles.td, color: '#dc2626', fontWeight: 'bold' }}>{s.exited > 0 ? `▼ ${s.exited}명` : '-'}</td>
                  <td style={{ ...mcStyles.td, color: '#059669', fontWeight: 'bold' }}>{s.entered > 0 ? `▲ ${s.entered}명` : '-'}</td>
                  <td style={{ ...mcStyles.td, color: '#d97706', fontWeight: 'bold' }}>{s.risk > 0 ? `⚠ ${s.risk}명` : '-'}</td>
                  <td style={{ ...mcStyles.td, fontWeight: 'bold', color: net > 0 ? '#059669' : net < 0 ? '#dc2626' : '#6b7280' }}>
                    {net > 0 ? `+${net}명` : net < 0 ? `${net}명` : '±0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>* 행 클릭 시 해당 과목 상세 조회</p>
      </div>

      <div style={{ border: '2px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
          {SUBJECTS.map(s => {
            const d     = getSubjectData(s.key);
            const total = d.exited.length + d.entered.length + d.risk.length;
            return (
              <button key={s.key} style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: '13px',
                fontWeight: selectedSubject === s.key ? 'bold' : 'normal',
                background: selectedSubject === s.key ? 'white' : 'transparent',
                color:      selectedSubject === s.key ? '#1e40af' : '#6b7280',
                borderBottom: selectedSubject === s.key ? '2px solid #1e40af' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }} onClick={() => setSelectedSubject(s.key)}>
                {s.label}
                {total > 0 && (
                  <span style={{ marginLeft: '4px', fontSize: '10px', padding: '1px 5px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626' }}>
                    {total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {Object.entries(tabConfig).map(([key, cfg]) => (
              <button key={key} style={{
                padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 'bold', border: 'none',
                background: activeTab === key ? cfg.color : cfg.bg,
                color:      activeTab === key ? 'white'   : cfg.color,
                transition: 'all 0.15s',
              }} onClick={() => setActiveTab(key)}>
                {cfg.label}
                <span style={{ marginLeft: '6px', fontSize: '12px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.3)', color: activeTab === key ? 'white' : cfg.color }}>
                  {subjectData[key].length}
                </span>
              </button>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            {tabConfig[activeTab].desc} &nbsp;|&nbsp;
            <span style={{ color: tabConfig[activeTab].color, fontWeight: 'bold' }}>
              {SUBJECTS.find(s => s.key === selectedSubject)?.label} {subjectData[activeTab].length}명
            </span>
          </p>

          <input
            placeholder="이름 또는 반 검색" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', marginBottom: '12px', width: '200px' }}
          />

          {filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>해당 학생 없음</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[...filteredList]
                .sort((a, b) => a.ban - b.ban || a.number - b.number)
                .map((s, i) => (
                  <div key={i} style={{
                    background: 'white', border: `1.5px solid ${tabConfig[activeTab].color}33`,
                    borderRadius: '10px', padding: '10px 14px',
                    minWidth: '160px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>{s.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{s.ban}반 {s.number}번</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: GRADE_COLORS[s.prevGrade - 1], fontWeight: 'bold' }}>
                        {s.prevGrade}등급
                      </span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>→</span>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: tabConfig[activeTab].bg, color: tabConfig[activeTab].color, fontWeight: 'bold' }}>
                        {s.currGrade}등급
                      </span>
                    </div>
                    {/* diff = 이전 - 현재, diff > 0 이면 향상 */}
                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 'bold', color: tabConfig[activeTab].color }}>
                      {s.diff > 0 ? `▲ ${s.diff}등급 향상`
                       : s.diff < 0 ? `▼ ${Math.abs(s.diff)}등급 하락`
                       : '→ 유지'}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const mcStyles = {
  th: { padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', color: '#374151', fontSize: '13px', border: '1px solid #e5e7eb' },
  td: { padding: '10px 12px', textAlign: 'center', fontSize: '13px', border: '1px solid #f3f4f6' },
};

// ══════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════
export default function DetailComparePage() {
  const [exams,      setExams]      = useState([]);
  const [currExam,   setCurrExam]   = useState('');
  const [prevExam,   setPrevExam]   = useState('');
  const [data,       setData]       = useState(null);
  const [mainTab,    setMainTab]    = useState('school');
  const [distTab,    setDistTab]    = useState('bar');
  const [migSubject, setMigSubject] = useState('korean');
  const [sortKey,    setSortKey]    = useState('total_improvement');
  const [sortDir,    setSortDir]    = useState('desc');
  const [filterBan,  setFilterBan]  = useState('전체');
  const [search,     setSearch]     = useState('');

  const schoolRef    = useRef(null);
  const studentRef   = useRef(null);
  const migrationRef = useRef(null); // ✅ 추가

  useEffect(() => {
    api.get('/exams').then(res => setExams(res.data));
  }, []);

  const load = async () => {
    if (!currExam || !prevExam) return;
    const res = await api.get(
      `/analysis/detail-compare?exam_name=${encodeURIComponent(currExam)}&prev_exam_name=${encodeURIComponent(prevExam)}`
    );
    setData(res.data);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // ✅ PDF 저장 - ref null 체크 + try/catch
  const savePDF = async () => {
    let el = null;
    if (mainTab === 'school')    el = schoolRef.current;
    if (mainTab === 'student')   el = studentRef.current;
    if (mainTab === 'migration') el = migrationRef.current;

    if (!el) {
      alert('저장할 화면을 찾을 수 없습니다.');
      return;
    }

    try {
      const pdf   = new jsPDF('l', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // ✅ el 안의 직접 자식 카드들을 하나씩 캡처
      const cards = Array.from(el.children);
      let isFirst = true;

      for (const card of cards) {
        const canvas  = await html2canvas(card, {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: -window.scrollY,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgW    = pageW;
        const imgH    = (canvas.height * imgW) / canvas.width;

        if (!isFirst) pdf.addPage();
        isFirst = false;

        // 카드 하나가 한 페이지보다 크면 나눠서 출력
        if (imgH <= pageH) {
          pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
        } else {
          let remainH = imgH;
          let offset  = 0;
          let firstPage = true;

          while (remainH > 0) {
            if (!firstPage) pdf.addPage();
            firstPage = false;

            pdf.addImage(imgData, 'PNG', 0, -offset, imgW, imgH);
            remainH -= pageH;
            offset  += pageH;
          }
        }
      }

      pdf.save(`시험비교_${currExam}_vs_${prevExam}.pdf`);
    } catch (e) {
      alert('PDF 저장 중 오류가 발생했습니다: ' + e.message);
    }
  };

  const g1ChartData = data ? SUBJECTS.map(s => ({
    name: s.label,
    이전: data.grade_dist_compare[s.key]?.prev_g1 ?? 0,
    현재: data.grade_dist_compare[s.key]?.curr_g1 ?? 0,
  })) : [];

  const radarData = data ? SUBJECTS.map(s => ({
    subject:    s.label,
    이전:       data.subject_compare[s.key]?.prev_grade
                  ? parseFloat((10 - data.subject_compare[s.key].prev_grade).toFixed(2)) : 0,
    현재:       data.subject_compare[s.key]?.curr_grade
                  ? parseFloat((10 - data.subject_compare[s.key].curr_grade).toFixed(2)) : 0,
    prev_grade: data.subject_compare[s.key]?.prev_grade,
    curr_grade: data.subject_compare[s.key]?.curr_grade,
  })) : [];

  const summary = data?.school_summary;
  const bans = data
    ? ['전체', ...[...new Set(data.students.map(s => s.ban))].sort((a, b) => a - b)]
    : [];

  const filteredStudents = data ? data.students
    .filter(s => {
      const banOk  = filterBan === '전체' || s.ban === Number(filterBan);
      const nameOk = s.name.includes(search);
      return banOk && nameOk;
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? -999;
      const bv = b[sortKey] ?? -999;
      return sortDir === 'asc' ? av - bv : bv - av;
    }) : [];

  const SortTh = ({ label, sortK }) => (
    <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort(sortK)}>
      {label} {sortKey === sortK ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  const mainTabs = [
    { key: 'school',    label: '🏫 학교 전체 현황' },
    { key: 'migration', label: '🔄 등급 이동 분석' },
    { key: 'student',   label: '👤 학생별 비교' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        <h2 style={styles.title}>📊 시험 간 상세 비교</h2>
        {data && <button style={styles.pdfBtn} onClick={savePDF}>📄 PDF 저장</button>}
      </div>

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>현재 시험 (기준)</label>
            <select style={styles.select} value={currExam} onChange={e => setCurrExam(e.target.value)}>
              <option value="">선택</option>
              {exams.map(e => <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>)}
            </select>
          </div>
          <div style={styles.vsLabel}>VS</div>
          <div style={styles.field}>
            <label style={styles.label}>이전 시험 (비교 대상)</label>
            <select style={styles.select} value={prevExam} onChange={e => setPrevExam(e.target.value)}>
              <option value="">선택</option>
              {exams.filter(e => e.exam_name !== currExam).map(e => <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>)}
            </select>
          </div>
          <button style={styles.btn} onClick={load}>비교</button>
        </div>
      </div>

      {data && (
        <>
          <div style={styles.mainTabRow}>
            {mainTabs.map(t => (
              <button key={t.key}
                style={{ ...styles.mainTab, ...(mainTab === t.key ? styles.mainTabActive : {}) }}
                onClick={() => setMainTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ 학교 전체 현황 ══ */}
          {mainTab === 'school' && (
            <div ref={schoolRef}>
              <div style={styles.summaryRow}>
                {[
                  { label: '전체 학생', prev: `${summary.prev_total}명`, curr: `${summary.curr_total}명`, diff: null },
                  { label: '전 과목 1등급 합계', prev: `${summary.prev_total_g1}건`, curr: `${summary.curr_total_g1}건`,
                    diff: summary.curr_total_g1 - summary.prev_total_g1, isGrade: false },
                  { label: '전체 평균 등급', prev: `${summary.prev_avg_grade}등급`, curr: `${summary.curr_avg_grade}등급`,
                    diff: summary.prev_avg_grade != null && summary.curr_avg_grade != null
                      ? parseFloat((summary.prev_avg_grade - summary.curr_avg_grade).toFixed(2)) : null,
                    isGrade: true },
                ].map((item, i) => (
                  <div key={i} style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>{item.label}</div>
                    <div style={styles.summaryCompare}>
                      <div style={styles.summarySide}>
                        <div style={styles.summaryTag}>이전</div>
                        <div style={styles.summaryVal}>{item.prev}</div>
                      </div>
                      <div style={styles.summaryArrow}>→</div>
                      <div style={styles.summarySide}>
                        <div style={{ ...styles.summaryTag, background: '#1e40af', color: 'white' }}>현재</div>
                        <div style={styles.summaryVal}>{item.curr}</div>
                      </div>
                    </div>
                    {item.diff != null && (
                      <div style={{ ...styles.summaryDiff, color: item.diff > 0 ? '#059669' : item.diff < 0 ? '#dc2626' : '#6b7280' }}>
                        {item.diff > 0 ? '▲' : item.diff < 0 ? '▼' : '→'}{' '}
                        {item.isGrade
                          ? `${Math.abs(item.diff)}등급 ${item.diff > 0 ? '향상' : '하락'}`
                          : `${item.diff > 0 ? '+' : ''}${item.diff}건`}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>과목별 1등급 인원 변화<span style={styles.chartSub}>({prevExam} → {currExam})</span></h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={g1ChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="이전" fill="#93c5fd" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="이전" position="top" style={{ fontSize: 12, fill: '#6b7280' }} />
                    </Bar>
                    <Bar dataKey="현재" fill="#1e40af" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="현재" position="top" style={{ fontSize: 12, fill: '#1e40af', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={styles.badgeRow}>
                  {SUBJECTS.map(s => {
                    const prev = data.grade_dist_compare[s.key]?.prev_g1 ?? 0;
                    const curr = data.grade_dist_compare[s.key]?.curr_g1 ?? 0;
                    return (
                      <div key={s.key} style={styles.badgeItem}>
                        <span style={styles.badgeSubject}>{s.label}</span>
                        <span style={styles.badgeNums}>{prev}명 → {curr}명</span>
                        <DiffBadge curr={curr} prev={prev} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>과목별 평균 등급 비교<span style={styles.chartSub}>(높을수록 좋음)</span></h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13 }} />
                    <Radar name={prevExam} dataKey="이전" stroke="#93c5fd" fill="#93c5fd" fillOpacity={0.3} />
                    <Radar name={currExam} dataKey="현재" stroke="#1e40af" fill="#1e40af" fillOpacity={0.3} />
                    <Legend />
                    <Tooltip formatter={(val, name, props) => {
                      const g = name === prevExam ? props.payload.prev_grade : props.payload.curr_grade;
                      return [`평균 ${g}등급`, name];
                    }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ ...styles.chartTitle, marginBottom: 0 }}>
                    등급별 인원 분포 — 전 과목
                    <span style={styles.chartSub}>({prevExam} 파랑 / {currExam} 빨강)</span>
                  </h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[{ key: 'bar', label: '📊 막대그래프' }, { key: 'line', label: '📈 꺾은선+변화' }].map(t => (
                      <button key={t.key} style={{
                        padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                        border: distTab === t.key ? '2px solid #1e40af' : '2px solid #e5e7eb',
                        background: distTab === t.key ? '#eff6ff' : 'white',
                        color: distTab === t.key ? '#1e40af' : '#6b7280',
                      }} onClick={() => setDistTab(t.key)}>{t.label}</button>
                    ))}
                  </div>
                </div>
                {distTab === 'bar' && (
                  <div style={styles.distGrid}>
                    {SUBJECTS.map(s => {
                      const chartData = Array.from({ length: 9 }, (_, i) => ({
                        grade: `${i + 1}등급`,
                        이전:  data.grade_dist_compare[s.key]?.prev_dist[i + 1] ?? 0,
                        현재:  data.grade_dist_compare[s.key]?.curr_dist[i + 1] ?? 0,
                      }));
                      const maxVal = Math.max(...chartData.map(d => Math.max(d.이전, d.현재)));
                      const yMax   = Math.ceil(maxVal / 5) * 5 || 10;
                      return (
                        <div key={s.key} style={styles.distSubjectCard}>
                          <div style={styles.distSubjectTitle}>{s.label}</div>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="grade" tick={{ fontSize: 11 }} tickLine={false} />
                              <YAxis allowDecimals={false} domain={[0, yMax]} tickCount={yMax + 1} tick={{ fontSize: 11 }} width={28} />
                              <Tooltip formatter={(val, name) => [`${val}명`, name]} contentStyle={{ fontSize: '12px' }} />
                              <Bar dataKey="이전" fill="#2f03cf" radius={[3, 3, 0, 0]}>
                                <LabelList dataKey="이전" position="top" style={{ fontSize: 10, fill: '#04318b' }} formatter={v => v > 0 ? v : ''} />
                              </Bar>
                              <Bar dataKey="현재" fill="#ff0000" radius={[3, 3, 0, 0]}>
                                <LabelList dataKey="현재" position="top" style={{ fontSize: 10, fill: '#6e0018', fontWeight: 'bold' }} formatter={v => v > 0 ? v : ''} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                )}
                {distTab === 'line' && (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '24px', height: '3px', borderTop: '2px dashed #2f03cf' }} />
                        <span style={{ fontSize: '12px', color: '#2f03cf', fontWeight: 'bold' }}>{prevExam} (이전)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '24px', height: '3px', background: '#ff0000' }} />
                        <span style={{ fontSize: '12px', color: '#ff0000', fontWeight: 'bold' }}>{currExam} (현재)</span>
                      </div>
                    </div>
                    <div style={styles.distGrid}>
                      {SUBJECTS.map(s => (
                        <AreaDiffChart key={s.key} distData={data.grade_dist_compare[s.key]} subjectLabel={s.label} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>과목별 등급 구간 변화 — 히트맵<span style={styles.chartSub}>({prevExam} → {currExam})</span></h3>
                <GradeHeatmap data={data} />
              </div>
            </div>
          )}

          {/* ══ 등급 이동 분석 ══ */}
          {mainTab === 'migration' && (
            <div ref={migrationRef}> {/* ✅ ref 추가 */}
              <div style={styles.chartCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ ...styles.chartTitle, marginBottom: 0 }}>
                    🔢 등급 이동 매트릭스
                    <span style={styles.chartSub}>셀 클릭 시 학생 명단 확인</span>
                  </h3>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {SUBJECTS.map(s => (
                      <button key={s.key} style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                        fontWeight: migSubject === s.key ? 'bold' : 'normal', cursor: 'pointer',
                        border: migSubject === s.key ? '2px solid #1e40af' : '2px solid #e5e7eb',
                        background: migSubject === s.key ? '#1e40af' : 'white',
                        color: migSubject === s.key ? 'white' : '#374151',
                      }} onClick={() => setMigSubject(s.key)}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <MigrationMatrix
                  students={data.students}
                  subjectKey={migSubject}
                  subjectLabel={SUBJECTS.find(s => s.key === migSubject)?.label}
                />
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>
                  🎯 상위권 이탈 · 진입 · 위험군 분석
                  <span style={styles.chartSub}>({prevExam} → {currExam})</span>
                </h3>
                <MigrationCards students={data.students} prevExam={prevExam} currExam={currExam} />
              </div>
            </div>
          )}

          {/* ══ 학생별 비교 ══ */}
          {mainTab === 'student' && (
            <div ref={studentRef}>
              <div style={styles.filterRow}>
                <div style={styles.banBtns}>
                  {bans.map(b => (
                    <button key={b}
                      style={{ ...styles.banBtn, ...(filterBan === String(b) ? styles.banBtnActive : {}) }}
                      onClick={() => setFilterBan(String(b))}>
                      {b === '전체' ? '전체' : `${b}반`}
                    </button>
                  ))}
                </div>
                <input placeholder="이름 검색" value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
                <span style={styles.count}>{filteredStudents.length}명</span>
              </div>

              <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>반</th>
                      <th style={styles.th}>번호</th>
                      <th style={styles.th}>이름</th>
                      {SUBJECTS.map(s => (
                        <React.Fragment key={s.key}>
                          <th style={styles.th}>{s.label}<br />현재등급</th>
                          <th style={styles.th}>{s.label}<br />등급변화</th>
                        </React.Fragment>
                      ))}
                      <SortTh label="종합향상" sortK="total_improvement" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => (
                      <tr key={i} style={
                        s.total_improvement > 0 ? { background: '#f0fdf4' } :
                        s.total_improvement < 0 ? { background: '#fff7f7' } :
                        i % 2 === 0 ? {} : { background: '#f9fafb' }
                      }>
                        <td style={styles.td}>{s.ban}</td>
                        <td style={styles.td}>{s.number}</td>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{s.name}</td>
                        {SUBJECTS.map(sub => {
                          const gradeKey = `${sub.key}_grade`;
                          const diffKey  = `diff_${sub.key}_grade`;
                          return (
                            <React.Fragment key={sub.key}>
                              <td style={styles.td}>{s[gradeKey] ?? '-'}</td>
                              <td style={{ ...styles.td, ...diffStyle(s[diffKey]) }}>
                                {s.has_prev ? diffText(s[diffKey], true) : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td style={{ ...styles.td, fontWeight: 'bold', fontSize: '14px', ...diffStyle(s.total_improvement) }}>
                          {s.has_prev
                            ? (s.total_improvement > 0 ? `▲${s.total_improvement}`
                               : s.total_improvement < 0 ? `▼${Math.abs(s.total_improvement)}` : '→')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container:        { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  titleRow:         { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title:            { fontSize: '24px', color: '#1e40af', margin: 0 },
  pdfBtn:           { background: '#dc2626', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  card:             { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  row:              { display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  field:            { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' },
  label:            { fontSize: '13px', fontWeight: 'bold', color: '#374151' },
  select:           { padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' },
  vsLabel:          { fontSize: '20px', fontWeight: 'bold', color: '#1e40af', alignSelf: 'flex-end', paddingBottom: '10px' },
  btn:              { background: '#1e40af', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', alignSelf: 'flex-end' },
  mainTabRow:       { display: 'flex', gap: '8px', marginBottom: '16px' },
  mainTab:          { padding: '10px 24px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' },
  mainTabActive:    { background: '#1e40af', color: 'white', border: '1px solid #1e40af' },
  summaryRow:       { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  summaryCard:      { flex: '1 1 200px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  summaryLabel:     { fontSize: '13px', color: '#6b7280', marginBottom: '12px', fontWeight: 'bold' },
  summaryCompare:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' },
  summarySide:      { textAlign: 'center' },
  summaryTag:       { fontSize: '11px', background: '#e5e7eb', color: '#374151', padding: '2px 8px', borderRadius: '10px', marginBottom: '4px', display: 'inline-block' },
  summaryVal:       { fontSize: '20px', fontWeight: 'bold', color: '#111827' },
  summaryArrow:     { fontSize: '20px', color: '#9ca3af' },
  summaryDiff:      { marginTop: '12px', fontSize: '15px', fontWeight: 'bold' },
  chartCard:        { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  chartTitle:       { fontSize: '15px', fontWeight: 'bold', color: '#374151', marginBottom: '12px' },
  chartSub:         { fontSize: '12px', color: '#9ca3af', marginLeft: '8px', fontWeight: 'normal' },
  badgeRow:         { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' },
  badgeItem:        { display: 'flex', alignItems: 'center', background: '#f9fafb', padding: '6px 12px', borderRadius: '8px', gap: '6px' },
  badgeSubject:     { fontSize: '13px', fontWeight: 'bold', color: '#374151' },
  badgeNums:        { fontSize: '13px', color: '#6b7280' },
  distGrid:         { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  distSubjectCard:  { background: '#f9fafb', padding: '14px 10px 8px', borderRadius: '10px', border: '1px solid #e5e7eb' },
  distSubjectTitle: { fontSize: '14px', fontWeight: 'bold', color: '#1e40af', textAlign: 'center', marginBottom: '6px' },
  filterRow:        { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  banBtns:          { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  banBtn:           { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '13px' },
  banBtnActive:     { background: '#1e40af', color: 'white', border: '1px solid #1e40af' },
  searchInput:      { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' },
  count:            { color: '#6b7280', fontSize: '14px' },
  table:            { borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
  th:               { padding: '9px 7px', border: '1px solid #e5e7eb', background: '#eff6ff', textAlign: 'center', whiteSpace: 'nowrap' },
  td:               { padding: '7px', border: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap' },
};