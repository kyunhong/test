import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
  const [open, setOpen] = useState(false);

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* 로고 */}
        <Link to="/dashboard" style={styles.logo}>
          📚 성적 분석 시스템
        </Link>

        {/* PC 메뉴 */}
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

        {/* 모바일 햄버거 */}
        <button style={styles.hamburger} onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {open && (
        <div style={styles.mobileMenu}>
          {MENUS.map(m => (
            <Link key={m.path} to={m.path}
              style={{
                ...styles.mobileItem,
                ...(location.pathname === m.path ? styles.mobileItemActive : {})
              }}
              onClick={() => setOpen(false)}>
              {m.label}
            </Link>
          ))}
        </div>
      )}
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
  hamburger: {
    display: 'none', background: 'none', border: 'none',
    color: 'white', fontSize: '22px', cursor: 'pointer',
  },
  mobileMenu: {
    background: '#1e3a8a', padding: '8px 0', display: 'flex',
    flexDirection: 'column',
  },
  mobileItem: {
    color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
    padding: '12px 24px', fontSize: '15px',
  },
  mobileItemActive: {
    background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 'bold',
  },
};