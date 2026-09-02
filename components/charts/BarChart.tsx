'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

interface BarChartProps {
  data: any;
  options?: any;
}

export function BarChart({ data, options }: BarChartProps) {
  return <Bar data={data} options={options} />;
}