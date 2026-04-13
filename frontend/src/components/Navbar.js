import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSessionId, exitSharedSession } from '../App';

const MENUS = [
  { path: '/dashboard',      label: '🏠 대시보드' },
  { path: '/upload',         label: '📂 업로드' },
  { path: '/all-students',   label: '📋 전체 학생' },
  { path: '/analysis',       label: '📈 성적 분석' },
  { path: '/ranking',        label: '🏆 학교 석차' },
  { path: '/class-compare',  label: '🏫 반별 비교' },
  { path: '/alert-students', label: '🔔 특이 학생' },
  { path: '/detail-compare', label: '📊 시험 비교' },
];

export default function Navbar() {
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const isSharedSession = !!sessionStorage.getItem('shared_session_id');

  const handleShareLink = () => {
    const sessionId = localStorage.getItem('session_id');
    const shareUrl = `${window.location.origin}/?session=${sessionId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* 로고 */}
        <Link to="/dashboard" style={styles.logo}>
          📚 성적 분석 시스템
        </Link>

        {/* 메뉴 */}
        <div style={styles.menuPC}>
          {MENUS.map(m => (
            <Link key={m.path} to={m.path} style={{
              ...styles.menuItem,
              ...(location.pathname === m.path ? styles.menuItemActive : {})
            }}>
              {m.label}
            </Link>
          ))}
        </div>

        {/* 공유 버튼 */}
        {isSharedSession ? (
          <button onClick={exitSharedSession} style={styles.exitBtn}>
            🔙 내 데이터로
          </button>
        ) : (
          <button onClick={handleShareLink} style={styles.shareBtn}>
            {copied ? '✅ 복사됨' : '🔗 공유'}
          </button>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    background: '#1e40af', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  inner: {
    maxWidth: '1400px', margin: '0 auto',
    padding: '0 20px', height: '64px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  logo: {
    color: 'white', fontWeight: 'bold', fontSize: '18px',
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  menuPC: {
    display: 'flex', gap: '2px', flexWrap: 'nowrap', overflowX: 'auto',
  },
  menuItem: {
    color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
    padding: '6px 10px', borderRadius: '6px', fontSize: '13px',
    whiteSpace: 'nowrap', transition: 'all 0.15s',
  },
  menuItemActive: {
    background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold',
  },
  shareBtn: {
    background: 'rgba(255,255,255,0.2)', color: 'white',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px', padding: '6px 12px',
    fontSize: '13px', cursor: 'pointer',
    whiteSpace: 'nowrap', fontWeight: 'bold', flexShrink: 0,
  },
  exitBtn: {
    background: '#ff9800', color: 'white',
    border: 'none', borderRadius: '6px',
    padding: '6px 12px', fontSize: '13px',
    cursor: 'pointer', whiteSpace: 'nowrap',
    fontWeight: 'bold', flexShrink: 0,
  },
};