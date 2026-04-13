import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage     from './components/DashboardPage';
import UploadPage        from './components/UploadPage';
import AllStudentsPage   from './components/AllStudentsPage';
import AnalysisPage      from './components/AnalysisPage';
import RankingPage       from './components/RankingPage';
import ClassComparePage  from './components/ClassComparePage';
import AlertStudentsPage from './components/AlertStudentsPage';
import DetailComparePage from './components/DetailComparePage';

// ✅ session_id 자동 생성 함수
const initSessionId = () => {
  // 1. URL에 ?session=xxx 파라미터가 있으면 그걸 사용 (공유 링크 접속)
  const urlParams = new URLSearchParams(window.location.search);
  const sharedSession = urlParams.get('session');
  
  if (sharedSession) {
    // 공유받은 세션 저장 (기존 세션 덮어쓰지 않고 임시 저장)
    sessionStorage.setItem('shared_session_id', sharedSession);
    return sharedSession;
  }

  // 2. 기존 session_id가 있으면 그대로 사용
  let sessionId = localStorage.getItem('session_id');
  
  // 3. 없으면 새로 생성
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) 
                        + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('session_id', sessionId);
  }
  
  return sessionId;
};

// ✅ 현재 사용 중인 session_id 가져오기 (전역 함수로 export)
export const getSessionId = () => {
  // 공유 세션 중이면 공유 session_id 반환
  const sharedSession = sessionStorage.getItem('shared_session_id');
  if (sharedSession) return sharedSession;
  
  // 아니면 내 session_id 반환
  return localStorage.getItem('session_id');
};

// ✅ 공유 세션 종료 (내 세션으로 돌아가기)
export const exitSharedSession = () => {
  sessionStorage.removeItem('shared_session_id');
  window.location.href = '/dashboard';
};

function AppContent() {
  useEffect(() => {
    initSessionId();
  }, []);

  // ✅ 공유 세션 중인지 확인
  const isSharedSession = !!sessionStorage.getItem('shared_session_id');

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff' }}>
      <Navbar />

      {/* ✅ 공유 세션 중일 때 상단 배너 표시 */}
      {isSharedSession && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          background: '#ff9800',
          color: 'white',
          textAlign: 'center',
          padding: '8px',
          zIndex: 999,
          fontSize: '14px'
        }}>
          공유된 데이터를 보고 있습니다.
          <button
            onClick={exitSharedSession}
            style={{
              marginLeft: '16px',
              background: 'white',
              color: '#ff9800',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 10px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            내 데이터로 돌아가기
          </button>
        </div>
      )}

      <div style={{ paddingTop: isSharedSession ? '104px' : '64px' }}>
        <Routes>
          <Route path="/"               element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard"      element={<DashboardPage />} />
          <Route path="/upload"         element={<UploadPage />} />
          <Route path="/all-students"   element={<AllStudentsPage />} />
          <Route path="/analysis"       element={<AnalysisPage />} />
          <Route path="/ranking"        element={<RankingPage />} />
          <Route path="/class-compare"  element={<ClassComparePage />} />
          <Route path="/alert-students" element={<AlertStudentsPage />} />
          <Route path="/detail-compare" element={<DetailComparePage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}