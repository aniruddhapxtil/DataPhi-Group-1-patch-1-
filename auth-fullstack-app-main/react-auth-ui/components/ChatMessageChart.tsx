// react-auth-ui/components/ChatMessageChart.tsx

import React from 'react';

interface ChartData {
  title: string;
  labels: string[];
  values: number[];
}

interface ChatMessageChartProps {
  chartData: ChartData;
}

const ChatMessageChart: React.FC<ChatMessageChartProps> = ({ chartData }) => {
  const maxValue = Math.max(...chartData.values);

  return (
    <div className="chat-message assistant">
      <h3 className="font-bold mb-4">{chartData.title}</h3>
      <div className="flex items-end h-48 space-x-2 border-l border-b border-gray-600 pl-2">
        {chartData.values.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end">
            <span className="text-xs mb-1">{value}</span>
            <div
              className="w-full bg-blue-500 rounded-t"
              style={{ height: `${(value / maxValue) * 100}%` }}
              title={`${chartData.labels[index]}: ${value}`}
            />
            <span className="text-xs mt-1">{chartData.labels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatMessageChart;