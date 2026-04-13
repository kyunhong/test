import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

function ComparisonPage() {
  const [exams, setExams] = useState([]);
  const [exam1, setExam1] = useState('');
  const [exam2, setExam2] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/exams').then(res => setExams(res.data));
  }, []);

  const loadComparison = async () => {
    const res = await api.get(`/analysis/comparison?exam1=${exam1}&exam2=${exam2}`);
    setData(res.data);
  };

  const makeChartData = () => {
    if (!data) return [];
    const subjects = ['korean','math','english','society','science','history'];
    const labels = { korean:'국어', math:'수학', english:'영어', society:'통합사회', science:'통합과학', history:'한국사' };
    return subjects.map(s => ({
      subject: labels[s],
      [data.exam1.name]: data.exam1.grade1[s],
      [data.exam2.name]: data.exam2.grade1[s],
    }));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔄 시험 비교</h2>

      <div style={styles.row}>
        <select style={styles.select} value={exam1} onChange={e => setExam1(e.target.value)}>
          <option value="">첫 번째 시험</option>
          {exams.map(e => <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>)}
        </select>
        <select style={styles.select} value={exam2} onChange={e => setExam2(e.target.value)}>
          <option value="">두 번째 시험</option>
          {exams.map(e => <option key={e.exam_name} value={e.exam_name}>{e.exam_name}</option>)}
        </select>
        <button style={styles.button} onClick={loadComparison}>비교</button>
      </div>

      {data && (
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>과목별 1등급 인원 비교</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={makeChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={exam1} fill="#3b82f6" />
              <Bar dataKey={exam2} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '30px', maxWidth: '1200px', margin: '0 auto' },
  title: { fontSize: '24px', marginBottom: '20px', color: '#1e40af' },
  row: { display: 'flex', gap: '12px', marginBottom: '24px' },
  select: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' },
  button: { background: '#1e40af', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer' },
  chartBox: { background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  chartTitle: { marginBottom: '16px', color: '#374151' }
};

export default ComparisonPage;