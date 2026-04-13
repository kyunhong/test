// frontend/src/components/Charts/ComparisonChart.jsx
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const SUBJECT_LABELS = {
  korean: "국어",
  math: "수학",
  english: "영어",
  social: "통합사회",
  science: "통합과학",
  history: "한국사",
};

export default function ComparisonChart({ comparisonData }) {
  if (!comparisonData) return null;

  const { exam1, exam2, grade1_change } = comparisonData;

  const chartData = Object.entries(grade1_change).map(
    ([subject, { before, after, change }]) => ({
      subject: SUBJECT_LABELS[subject],
      [exam1.name]: before,
      [exam2.name]: after,
      change,
    })
  );

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-bold text-gray-700 mb-1">
        📊 1등급 인원 비교
      </h3>
      <p className="text-sm text-gray-500 mb-3">
        {exam1.name} → {exam2.name}
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value, name) => [`${value}명`, name]}
          />
          <Legend />
          <Bar dataKey={exam1.name} fill="#93c5fd" radius={[4,4,0,0]} />
          <Bar dataKey={exam2.name} fill="#2563eb" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* 변화량 요약 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {chartData.map(({ subject, change }) => (
          <div
            key={subject}
            className={`rounded-lg p-2 text-center text-sm font-medium
              ${change > 0 ? "bg-blue-50 text-blue-700"
                : change < 0 ? "bg-red-50 text-red-700"
                : "bg-gray-50 text-gray-500"}`}
          >
            <div className="text-xs text-gray-500">{subject}</div>
            <div>
              {change > 0 ? `+${change}` : change}명
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}