import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage     from './components/DashboardPage';
import UploadPage        from './components/UploadPage';
import AllStudentsPage   from './components/AllStudentsPage';
import AnalysisPage      from './components/AnalysisPage';
import RankingPage       from './components/RankingPage';
import ClassComparePage  from './components/ClassComparePage';
import AlertStudentsPage from './components/AlertStudentsPage';
import DetailComparePage from './components/DetailComparePage';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#f0f4ff' }}>
        <Navbar />
        <div style={{ paddingTop: '64px' }}>
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
    </BrowserRouter>
  );
}