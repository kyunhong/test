import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// ── 업로드 전 데이터 검증 ──
const validateData = (rows) => {
  const errors   = [];
  const warnings = [];
  const seen     = new Set();

  rows.forEach((row, idx) => {
    const r   = idx + 2;
    const ban = row[0], num = row[1], name = row[2];

    if (!ban || !num || !name) {
      errors.push(`${r}행: 반/번호/이름 중 빈 값이 있습니다`);
    }

    const key = `${ban}-${num}`;
    if (seen.has(key)) {
      warnings.push(`${r}행: ${ban}반 ${num}번 중복 데이터`);
    }
    seen.add(key);

    const gradeIdxs = [5, 8, 9, 12, 15, 16];
    const gradeNames = ['국어등급','수학등급','영어등급','사회등급','과학등급','한국사등급'];
    gradeIdxs.forEach((gi, i) => {
      const g = row[gi];
      if (g !== undefined && g !== null && g !== '') {
        if (isNaN(g) || g < 1 || g > 9) {
          errors.push(`${r}행 ${name}: ${gradeNames[i]}가 ${g}로 비정상입니다 (1~9)`);
        }
      }
    });

    const stdIdxs  = [3, 6, 10, 13];
    const stdNames = ['국어표준','수학표준','사회표준','과학표준'];
    stdIdxs.forEach((si, i) => {
      const v = row[si];
      if (v !== undefined && v !== null && v !== '') {
        if (isNaN(v) || v < 0 || v > 200) {
          warnings.push(`${r}행 ${name}: ${stdNames[i]}가 ${v}로 비정상입니다`);
        }
      }
    });
  });

  return { errors, warnings };
};

export default function UploadPage() {
  const [file,         setFile]         = useState(null);
  const [examName,     setExamName]     = useState('');
  const [examDate,     setExamDate]     = useState('');
  const [message,      setMessage]      = useState('');
  const [loading,      setLoading]      = useState(false);
  const [exams,        setExams]        = useState([]);
  const [deleteTarget, setDeleteTarget] = useState('');
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [preview,      setPreview]      = useState(null);
  const [validation,   setValidation]   = useState(null);
  const [showPreview,  setShowPreview]  = useState(false);

  // ✅ session_id 가져오기
  const getSessionId = () => localStorage.getItem('session_id');

  const loadExams = () => {
    const sessionId = getSessionId();
    if (!sessionId) return;  // ✅ session_id 없으면 조회 안함

    api.get('/exams', { params: { session_id: sessionId } })  // ✅ session_id 추가
      .then(res => {
        const list = Array.isArray(res.data) ? res.data
                   : Array.isArray(res.data.exams) ? res.data.exams
                   : [];
        setExams(list);
      });
  };

  useEffect(() => { loadExams(); }, []);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setValidation(null);

    try {
      const XLSX = await import('xlsx');
      const buffer = await f.arrayBuffer();
      const wb    = XLSX.read(buffer, { type: 'array' });
      const ws    = wb.Sheets[wb.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      const dataRows = rows.slice(1).filter(r =>
        r.some(cell => cell !== null && cell !== '')
      );
      const result = validateData(dataRows);
      setPreview(dataRows);
      setValidation(result);
      setShowPreview(true);
    } catch (err) {
      setValidation({ errors: ['파일을 읽을 수 없습니다: ' + err.message], warnings: [] });
    }
  };

  const handleUpload = async () => {
    if (!file || !examName || !examDate) {
      setMessage('⚠️ 모든 항목을 입력해주세요');
      return;
    }
    if (validation?.errors?.length > 0) {
      setMessage('❌ 오류를 먼저 수정해주세요');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('exam_name', examName);
    formData.append('exam_date', examDate);

    const existingSessionId = getSessionId();
    if (existingSessionId) {
      formData.append('session_id', existingSessionId);
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await api.post('/upload', formData);

      // ✅ session_id가 없을 때만 저장 (처음 업로드할 때만)
      if (!localStorage.getItem('session_id')) {
        localStorage.setItem('session_id', res.data.session_id);
      }

      setMessage(`✅ ${res.data.message}`);
      setFile(null);
      setExamName('');
      setExamDate('');
      setPreview(null);
      setValidation(null);
      setShowPreview(false);
      loadExams();
    } catch (err) {
      setMessage('❌ 업로드 실패: ' + (err.response?.data?.detail || err.message));
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    try {
      const sessionId = getSessionId();  // ✅ session_id 가져오기
      const res = await api.delete(
        `/exams/${encodeURIComponent(deleteTarget)}`,
        { params: { session_id: sessionId } }  // ✅ session_id 추가
      );
      setMessage(`🗑️ ${res.data.message}`);
      setShowConfirm(false);
      setDeleteTarget('');
      loadExams();
    } catch (err) {
      setMessage('❌ 삭제 실패: ' + err.message);
    }
  };

  const handleExcelDownload = async (examName) => {
    try {
      const sessionId = getSessionId();  // ✅ session_id 가져오기
      const response = await fetch(
        `https://test-production-7665.up.railway.app/analysis/export-excel?exam_name=${encodeURIComponent(examName)}&session_id=${sessionId}`  // ✅ session_id 추가
      );
      if (!response.ok) {
        const err = await response.json();
        alert('다운로드 실패: ' + (err.detail || response.statusText));
        return;
      }
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `${examName}_성적.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('다운로드 실패: ' + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📂 성적 파일 업로드</h2>
      <div style={styles.layout}>
        {/* ── 업로드 카드 ── */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>새 성적 업로드</h3>
          <div style={styles.field}>
            <label style={styles.label}>시험 이름</label>
            <input style={styles.input}
              placeholder="예: 2024년 3월 모의고사"
              value={examName}
              onChange={e => setExamName(e.target.value)} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>시험 날짜</label>
            <input style={styles.input} type="month"
              value={examDate}
              onChange={e => setExamDate(e.target.value)} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>엑셀 파일 (.xlsx)</label>
            <input type="file" accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={styles.input} />
            {file && <span style={styles.fileName}>📄 {file.name}</span>}
          </div>

          {/* ── 검증 결과 ── */}
          {validation && (
            <div style={styles.validBox}>
              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <div style={styles.validOk}>✅ 데이터 검증 통과 ({preview?.length}행)</div>
              )}
              {validation.errors.length > 0 && (
                <div style={styles.validError}>
                  <b>❌ 오류 ({validation.errors.length}건)</b>
                  <ul style={styles.validList}>
                    {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div style={styles.validWarn}>
                  <b>⚠️ 경고 ({validation.warnings.length}건) — 업로드는 가능</b>
                  <ul style={styles.validList}>
                    {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── 미리보기 토글 ── */}
          {preview && preview.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <button style={styles.previewToggle}
                onClick={() => setShowPreview(p => !p)}>
                {showPreview ? '▲ 미리보기 접기' : '▼ 미리보기 펼치기'}
                ({preview.length}행)
              </button>
              {showPreview && (
                <div style={styles.previewTable}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['반','번호','이름','국어표준','국어백분위','국어등급',
                          '수학표준','수학백분위','수학등급','영어등급',
                          '사회표준','사회백분위','사회등급',
                          '과학표준','과학백분위','과학등급','한국사등급'
                        ].map(h => <th key={h} style={styles.th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={styles.td}>
                              {cell ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                      ...외 {preview.length - 10}행 더 있음
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <button style={{
            ...styles.uploadBtn,
            opacity: loading || validation?.errors?.length > 0 ? 0.6 : 1,
            cursor: validation?.errors?.length > 0 ? 'not-allowed' : 'pointer'
          }} onClick={handleUpload} disabled={loading}>
            {loading ? '⏳ 업로드 중...' : '⬆️ 업로드'}
          </button>

          {message && (
            <div style={{
              ...styles.message,
              background: message.startsWith('✅') ? '#d1fae5' :
                          message.startsWith('🗑️') ? '#fef3c7' : '#fee2e2',
              color: message.startsWith('✅') ? '#065f46' :
                     message.startsWith('🗑️') ? '#92400e' : '#991b1b',
            }}>
              {message}
            </div>
          )}
        </div>

        {/* ── 업로드된 시험 목록 ── */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>업로드된 시험 목록</h3>
          {exams.length === 0 ? (
            <p style={styles.empty}>업로드된 시험이 없습니다</p>
          ) : (
            <div style={styles.examList}>
              {exams.map(e => (
                <div key={e.exam_name} style={styles.examItem}>
                  <div>
                    <div style={styles.examName}>{e.exam_name}</div>
                    <div style={styles.examDate}>{e.exam_date}</div>
                  </div>
                  <div style={styles.examBtns}>
                    <button style={styles.excelBtn}
                      onClick={() => handleExcelDownload(e.exam_name)}>
                      📥 엑셀
                    </button>
                    <button style={styles.deleteBtn}
                      onClick={() => {
                        setDeleteTarget(e.exam_name);
                        setShowConfirm(true);
                      }}>
                      🗑️ 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 삭제 확인 모달 ── */}
      {showConfirm && (
        <div style={modal.overlay}>
          <div style={modal.box}>
            <h3 style={modal.title}>⚠️ 삭제 확인</h3>
            <p style={modal.text}>
              <b>'{deleteTarget}'</b> 데이터를<br />
              정말 삭제하시겠습니까?<br />
              <span style={{ color: '#dc2626', fontSize: '13px' }}>
                삭제 후 복구할 수 없습니다.
              </span>
            </p>
            <div style={modal.btnRow}>
              <button style={modal.cancelBtn} onClick={() => setShowConfirm(false)}>취소</button>
              <button style={modal.confirmBtn} onClick={handleDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 엑셀 형식 안내 ── */}
      <div style={styles.guide}>
        <h3 style={{ marginBottom: '12px' }}>📋 엑셀 파일 열 순서 안내</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['반','번호','이름',
                  '국어표준','국어백분위','국어등급',
                  '수학표준','수학백분위','수학등급','영어등급',
                  '통합사회표준','통합사회백분위','통합사회등급',
                  '통합과학표준','통합과학백분위','통합과학등급','한국사등급'
                ].map(h => <th key={h} style={styles.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                {['1','1','홍길동','130','85','2','140','90','1','2',
                  '60','70','3','58','65','3','2'
                ].map((v, i) => <td key={i} style={styles.td}>{v}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container:     { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  title:         { fontSize: '24px', marginBottom: '20px', color: '#1e40af' },
  layout:        { display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' },
  card:          { flex: 1, minWidth: '300px', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTitle:     { fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '16px' },
  field:         { marginBottom: '14px' },
  label:         { display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151', fontSize: '14px' },
  input:         { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  fileName:      { display: 'block', marginTop: '4px', fontSize: '12px', color: '#6b7280' },
  validBox:      { marginBottom: '12px' },
  validOk:       { background: '#d1fae5', color: '#065f46', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' },
  validError:    { background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '6px' },
  validWarn:     { background: '#fef3c7', color: '#92400e', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' },
  validList:     { margin: '6px 0 0 16px', padding: 0, lineHeight: 1.6 },
  previewToggle: { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginBottom: '8px' },
  previewTable:  { overflowX: 'auto', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' },
  uploadBtn:     { width: '100%', background: '#1e40af', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '15px', marginTop: '8px' },
  message:       { marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' },
  empty:         { color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px' },
  examList:      { display: 'flex', flexDirection: 'column', gap: '10px' },
  examItem:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  examName:      { fontWeight: 'bold', fontSize: '14px', color: '#111827' },
  examDate:      { fontSize: '12px', color: '#6b7280', marginTop: '2px' },
  examBtns:      { display: 'flex', gap: '6px' },
  excelBtn:      { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  deleteBtn:     { background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  guide:         { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  table:         { borderCollapse: 'collapse', fontSize: '12px' },
  th:            { background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px', whiteSpace: 'nowrap' },
  td:            { border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center' },
};

const modal = {
  overlay:    { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  box:        { background: 'white', borderRadius: '12px', padding: '32px', minWidth: '320px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  title:      { fontSize: '18px', marginBottom: '12px', color: '#111827' },
  text:       { fontSize: '15px', color: '#374151', lineHeight: '1.6', marginBottom: '24px' },
  btnRow:     { display: 'flex', gap: '12px', justifyContent: 'center' },
  cancelBtn:  { padding: '10px 28px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '15px' },
  confirmBtn: { padding: '10px 28px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' },
};