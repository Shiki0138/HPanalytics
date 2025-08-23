import React from 'react';
import { TrendingUp, Trophy } from 'lucide-react';
import { PerformanceData } from '../data/mockData';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('recharts').then(recharts => {
  const { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } = recharts;
  
  return function ChartComponent({ data }: { data: PerformanceData[] }) {
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-800">{`${label}`}</p>
            <p className="text-sm text-primary-600">
              {`スコア: ${payload[0].value}点`}
            </p>
          </div>
        );
      }
      return null;
    };

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#0EA5E9" 
            strokeWidth={3}
            dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#0EA5E9', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };
}), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-gray-500">チャートを読み込み中...</div>
    </div>
  )
});

interface PerformanceTrackerProps {
  data: PerformanceData[];
}

const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({ data }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-primary-500" size={20} />
          <h2 className="text-xl font-semibold text-gray-800">30日間の改善軌跡</h2>
        </div>
      </div>

      <div className="mb-6">
        <div className="h-64">
          <Chart data={data} />
        </div>
      </div>

      <div className="bg-success-50 border border-success-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Trophy className="text-success-600" size={16} />
          <span className="font-medium text-success-800">主な成果</span>
        </div>
        <p className="text-sm text-success-700">
          サイト速度 40点→85点, 検索順位 平均23位→8位
        </p>
      </div>
    </div>
  );
};

export default PerformanceTracker;