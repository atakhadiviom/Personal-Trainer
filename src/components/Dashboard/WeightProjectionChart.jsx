import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const WeightProjectionChart = ({ weight, goal, dynamicTDEE }) => {
  if (!weight) return null;

  const data = Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    weight:
      goal === 'fatloss'
        ? parseInt(weight, 10) - i * (dynamicTDEE ? (500 * 7) / 7700 : 0.5)
        : parseInt(weight, 10) + i * (dynamicTDEE ? (500 * 7) / 7700 : 0.3),
  }));

  return (
    <div style={{ marginTop: '32px' }}>
      <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>12-Week Weight Projection</h4>
      <div
        style={{
          height: '220px',
          width: '100%',
          background: 'rgba(0,0,0,0.2)',
          padding: '16px 8px 8px 0',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border)',
        }}
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis dataKey="week" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis domain={['auto', 'auto']} stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={{ background: 'var(--bg-espresso)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            <Line type="monotone" dataKey="weight" stroke="var(--accent-purple)" strokeWidth={3} dot={{ fill: 'var(--accent-purple)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeightProjectionChart;
