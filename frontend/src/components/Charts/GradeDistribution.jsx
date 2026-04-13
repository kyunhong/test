// frontend/src/components/Charts/GradeDistribution.jsx
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const GRADE_COLORS = [
  "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd",
  "#fbbf24", "#f97316", "#ef4444", "#dc2626", "#991b1b"
];

const SUBJECT_LABELS = {
  korean: "국어",
  math: "수학",
  english: "영어",
  social: "통합사회",
  science: "통합과학",
  history: "한국사",
};

export default function GradeDistribution({ distributions, subject }) {
  const data = Object.entries(distributions[subject] || {}).map(
    ([grade, count]) => ({
      grade: `${grade}등급`,
      count,
      gradeNum: Number(grade),
    })
  );

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { grade, count } = payload[0].payload;
    const total = data.reduce((s, d) => s + d.count, 0);
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-white border rounded p-2 shadow text-sm">
        <p className="font-bold">{grade}</p>
        <p>{count}명 ({pct}%)</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-bold text-gray-700 mb-3">
        {SUBJECT_LABELS[subject]} 등급 분포
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="인원수" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.gradeNum}
                fill={GRADE_COLORS[entry.gradeNum - 1]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}