import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const subjects = [
  { key: 'korean_grade', label: '국어', color: '#3b82f6' },
  { key: 'math_grade', label: '수학', color: '#ef4444' },
  { key: 'english_grade', label: '영어', color: '#10b981' },
  { key: 'society_grade', label: '통합사회', color: '#f59e0b' },
  { key: 'science_grade', label: '통합과학', color: '#8b5cf6' },
  { key: 'history_grade', label: '한국사', color: '#6b7280' },
];

export default function StudentPage() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [studentsList, setStudentsList] = useState({});
  const [selectedBan, setSelectedBan] = useState(null);
  const [name, setName] = useState('');
  const [data, setData] = useState([]);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
      api.get('/exams').then(res => {
          const list = Array.isArray(res.data) ? res.data
                    : Array.isArray(res.data.exams) ? res.data.exams
                    : [];
          setExams(list);
      });
  }, []);

  const loadStudentsList = async (examName) => {
    setSelectedExam(examName);
    const res = await api.get(`/analysis/students-list?exam_name=${examName}`);
    setStudentsList(res.data);
    const firstBan = Object.keys(res.data)[0];
    if (firstBan) setSelectedBan(firstBan);
  };

  const searchStudent = async (studentName) => {
    setName(studentName);
    const res = await api.get(`/analysis/student?name=${encodeURIComponent(studentName)}`);
    setData(res.data);
  };

  const bans = Object.keys(studentsList).sort((a, b) => Number(a) - Number(b));

  return (
    <div style={styles.wrap}>
      {/* 사이드바 */}
      <div style={styles.sidebar}>
        <div style={styles.sideHeader}>학생 목록</div>

        <select style={styles.sideSelect} value={selectedExam}
          onChange={e => loadStudentsList(e.target.value)}>
          <option value="">시험 선택</option>
          {(Array.isArray(exams) ? exams : []).map(e => (
              <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>
          ))}
        </select>

        {bans.length > 0 && (
          <div style={styles.banTabs}>
            {bans.map(ban => (
              <button key={ban} style={{
                ...styles.banTab,
                ...(selectedBan === ban ? styles.banTabActive : {})
              }} onClick={() => setSelectedBan(ban)}>
                {ban}반
              </button>
            ))}
          </div>
        )}

        <div style={styles.studentList}>
          {selectedBan && studentsList[selectedBan]?.map((s, i) => (
            <div key={i}
              style={{
                ...styles.studentItem,
                ...(name === s.name ? styles.studentItemActive : {})
              }}
              onClick={() => searchStudent(s.name)}
            >
              <span style={styles.numBadge}>{s.number}</span>
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {/* 메인 */}
      <div style={styles.main}>
        <h2 style={styles.title}>👤 개별 학생 성적 추이</h2>

        {/* 직접 검색 */}
        <div style={styles.searchRow}>
          <input style={styles.input} placeholder="이름 직접 검색"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchStudent(searchInput)}
          />
          <button style={styles.btn} onClick={() => searchStudent(searchInput)}>검색</button>
        </div>

        {data.length > 0 && (
          <>
            <h3 style={styles.studentName}>{name} ({data[0]?.ban}반 {data[0]?.number}번)</h3>

            {/* 등급 추이 */}
            <div style={styles.chartBox}>
              <h4 style={styles.chartTitle}>등급 변화 추이</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam_name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 9]} ticks={[1,2,3,4,5,6,7,8,9]} reversed={false} />
                  <Tooltip />
                  <Legend />
                  {subjects.map(s => (
                    <Line key={s.key} type="monotone" dataKey={s.key}
                      name={s.label} stroke={s.color} strokeWidth={2}
                      dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 상세 표 */}
            <div style={styles.tableBox}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>시험</th>
                    <th style={styles.th}>국어표준</th>
                    <th style={styles.th}>국어등급</th>
                    <th style={styles.th}>수학표준</th>
                    <th style={styles.th}>수학등급</th>
                    <th style={styles.th}>영어등급</th>
                    <th style={styles.th}>사회표준</th>
                    <th style={styles.th}>사회등급</th>
                    <th style={styles.th}>과학표준</th>
                    <th style={styles.th}>과학등급</th>
                    <th style={styles.th}>한국사</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => (
                    <tr key={i} style={i % 2 === 0 ? {} : { background: '#f9fafb' }}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{d.exam_name}</td>
                      <td style={styles.td}>{d.korean_std ?? '-'}</td>
                      <td style={{ ...styles.td, color: d.korean_grade === 1 ? '#dc2626' : 'inherit', fontWeight: d.korean_grade <= 2 ? 'bold' : 'normal' }}>{d.korean_grade ?? '-'}</td>
                      <td style={styles.td}>{d.math_std ?? '-'}</td>
                      <td style={{ ...styles.td, color: d.math_grade === 1 ? '#dc2626' : 'inherit', fontWeight: d.math_grade <= 2 ? 'bold' : 'normal' }}>{d.math_grade ?? '-'}</td>
                      <td style={{ ...styles.td, color: d.english_grade === 1 ? '#dc2626' : 'inherit', fontWeight: d.english_grade <= 2 ? 'bold' : 'normal' }}>{d.english_grade ?? '-'}</td>
                      <td style={styles.td}>{d.society_std ?? '-'}</td>
                      <td style={{ ...styles.td, color: d.society_grade === 1 ? '#dc2626' : 'inherit' }}>{d.society_grade ?? '-'}</td>
                      <td style={styles.td}>{d.science_std ?? '-'}</td>
                      <td style={{ ...styles.td, color: d.science_grade === 1 ? '#dc2626' : 'inherit' }}>{d.science_grade ?? '-'}</td>
                      <td style={{ ...styles.td, color: d.history_grade === 1 ? '#dc2626' : 'inherit' }}>{d.history_grade ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data.length === 0 && name && (
          <div style={styles.empty}>'{name}' 학생 데이터를 찾을 수 없습니다.</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', height: 'calc(100vh - 52px)' },
  sidebar: {
    width: '220px', minWidth: '220px', background: 'white',
    borderRight: '1px solid #e5e7eb', display: 'flex',
    flexDirection: 'column', overflowY: 'auto'
  },
  sideHeader: {
    padding: '16px', fontWeight: 'bold', fontSize: '15px',
    color: '#1e40af', borderBottom: '1px solid #e5e7eb', background: '#eff6ff'
  },
  sideSelect: { margin: '12px', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' },
  banTabs: { display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '0 12px 8px' },
  banTab: { padding: '4px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '12px' },
  banTabActive: { background: '#1e40af', color: 'white', border: '1px solid #1e40af' },
  studentList: { flex: 1, overflowY: 'auto' },
  studentItem: {
    padding: '10px 16px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '8px', fontSize: '14px',
    borderBottom: '1px solid #f3f4f6'
  },
  studentItemActive: { background: '#eff6ff', color: '#1e40af', fontWeight: 'bold' },
  numBadge: {
    fontSize: '11px', color: '#6b7280', background: '#f3f4f6',
    borderRadius: '4px', padding: '1px 5px', minWidth: '24px', textAlign: 'center'
  },
  main: { flex: 1, padding: '24px', overflowY: 'auto' },
  title: { fontSize: '24px', marginBottom: '16px', color: '#1e40af' },
  searchRow: { display: 'flex', gap: '8px', marginBottom: '20px' },
  input: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' },
  btn: { background: '#1e40af', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  studentName: { fontSize: '18px', color: '#374151', marginBottom: '16px', fontWeight: 'bold' },
  chartBox: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' },
  chartTitle: { marginBottom: '12px', color: '#374151' },
  tableBox: { background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '10px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center', whiteSpace: 'nowrap' },
  td: { padding: '7px 8px', border: '1px solid #f3f4f6', textAlign: 'center' },
  empty: { padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }
};