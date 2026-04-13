// frontend/src/pages/Analysis.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import GradeDistribution from "../components/Charts/GradeDistribution";
import ComparisonChart from "../components/Charts/ComparisonChart";
import StudentTrendChart from "../components/Charts/StudentTrendChart";

const SUBJECTS = ["korean", "math", "english", "social", "science", "history"];

export default function Analysis() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [summary, setSummary] = useState(null);
  const [compareExam, setCompareExam] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [searchName, setSearchName] = useState("");
  const [searchClass, setSearchClass] = useState("");
  const [studentHistory, setStudentHistory] = useState(null);
  const [activeSubject, setActiveSubject] = useState("korean");

  // 시험 목록 로드
  useEffect(() => {
    axios.get("/api/upload/exams").then((res) => setExams(res.data));
  }, []);

  // 선택 시험 요약 로드
  useEffect(() => {
    if (!selectedExam) return;
    axios.get(`/api/analysis/${selectedExam}/summary`)
      .then((res) => setSummary(res.data));
  }, [selectedExam]);

  // 비교 데이터 로드
  useEffect(() => {
    if (!selectedExam || !compareExam) return;
    axios.get(`/api/comparison/exams/${selectedExam}/${compareExam}`)
      .then((res) => setComparisonData(res.data));
  }, [selectedExam, compareExam]);

  // 학생 검색
  const handleStudentSearch = async () => {
    if (!searchName || !searchClass) return;
    const res = await axios.get(
      `/api/comparison/student/${searchName}/${searchClass}`
    );
    setStudentHistory(res.data);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h1 className="text-2xl font-bold text-gray-800">
            🏫 학교 성적 분석 시스템
          </h1>
        </div>

        {/* 시험 선택 */}
        <div className="bg-white rounded-2xl shadow p-4 flex gap-4 flex-wrap">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              분석 시험 선택
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              onChange={(e) => setSelectedExam(Number(e.target.value))}
            >
              <option value="">-- 선택 --</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.student_count}명)
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              비교 시험 선택
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              onChange={(e) => setCompareExam(Number(e.target.value))}
            >
              <option value="">-- 선택 안함 --</option>
              {exams
                .filter((e) => e.id !== selectedExam)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* 요약 통계 카드 */}
        {summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {SUBJECTS.map((subj) => (
                <div
                  key={subj}
                  className="bg-white rounded-xl shadow p-3 text-center cursor-pointer
                             hover:ring-2 hover:ring-blue-400 transition"
                  onClick={() => setActiveSubject(subj)}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    {{"korean":"국어","math":"수학","english":"영어",
                      "social":"통사","science":"통과","history":"한국사"}[subj]}
                    1등급
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.grade1_counts[subj]}
                  </div>
                  <div className="text-xs text-gray-400">명</div>
                </div>
              ))}
            </div>

            {/* 과목별 등급 분포 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUBJECTS.map((subj) => (
                <GradeDistribution
                  key={subj}
                  distributions={summary.grade_distributions}
                  subject={subj}
                />
              ))}
            </div>
          </>
        )}

        {/* 시험 비교 */}
        {comparisonData && (
          <ComparisonChart comparisonData={comparisonData} />
        )}

        {/* 학생 개별 검색 */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h3 className="font-bold text-gray-700 mb-3">🔍 학생 성적 추이 조회</h3>
          <div className="flex gap-2">
            <input
              placeholder="반"
              type="number"
              value={searchClass}
              onChange={(e) => setSearchClass(e.target.value)}
              className="border rounded-lg px-3 py-2 w-20 text-sm"
            />
            <input
              placeholder="이름"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="border rounded-lg px-3 py-2 flex-1 text-sm"
            />
            <button
              onClick={handleStudentSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm
                         hover:bg-blue-700 transition"
            >
              조회
            </button>
          </div>
          {studentHistory && (
            <div className="mt-4">
              <StudentTrendChart historyData={studentHistory} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}