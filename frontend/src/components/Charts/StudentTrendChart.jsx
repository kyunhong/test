// frontend/src/components/Charts/StudentTrendChart.jsx
import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const SUBJECT_LINES = [
  { key: "korean_grade", label: "국어", color: "#2563eb" },
  { key: "math_grade", label: "수학", color: "#7c3aed" },
  { key: "english_grade", label: "영어", color: "#059669" },
  { key: "social_grade", label: "통합사회", color: "#d97706" },
  { key: "science_grade", label: "통합과학", color: "#dc2626" },
];

export default function StudentTrendChart({ historyData }) {
  if (!historyData) return null;

  const { name, history } = historyData;

  const chartData = history.map((h) => ({
    exam: h.exam_name.replace("전국연합학력평가", "모의").replace("년 ", "").replace("월 ", "/"),
    ...Object.fromEntries(
      SUBJECT_LINES.map(({ key }) => [key, h[key]])
    ),
    avg: h.avg_grade,
    rank: h.school_rank,
  }));

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-bold text-gray-700 mb-1">
        📈 {name} 성적 변화 추이
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        ※ Y축: 등급 (낮을수록 높은 성적)
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
          <YAxis
            domain={[1, 9]}
            reversed={false}
            tickCount={9}
            tick={{ fontSize: 12 }}
            label={{ value: "등급", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value, name) => [`${value}등급`, name]}
          />
          <Legend />
          {SUBJECT_LINES.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* 석차 변화 */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {chartData.map((d) => (
          <div
            key={d.exam}
            className="bg-gray-50 rounded-lg px-3 py-2 text-center text-sm"
          >
            <div className="text-xs text-gray-400">{d.exam}</div>
            <div className="font-bold text-gray-700">{d.rank}위</div>
            <div className="text-xs text-blue-600">평균 {d.avg}등급</div>
          </div>
        ))}
      </div>
    </div>
  );
}