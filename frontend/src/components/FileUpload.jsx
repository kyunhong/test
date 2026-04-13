// frontend/src/components/FileUpload.jsx
import React, { useState } from "react";
import api from "../api/axios"; 

export default function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [gradeYear, setGradeYear] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("파일을 선택해주세요.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("exam_name", examName);
    formData.append("exam_date", examDate);
    formData.append("grade_year", gradeYear);

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
      });
      onUploadSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "업로드 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">📂 성적 파일 업로드</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            시험명
          </label>
          <input
            type="text"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="예: 2024년 3월 전국연합학력평가"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시험 연월
            </label>
            <input
              type="month"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학년
            </label>
            <select
              value={gradeYear}
              onChange={(e) => setGradeYear(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value={1}>1학년</option>
              <option value={2}>2학년</option>
              <option value={3}>3학년</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            엑셀 파일
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium
                     hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "업로드 중..." : "업로드 및 분석"}
        </button>
      </form>
    </div>
  );
}