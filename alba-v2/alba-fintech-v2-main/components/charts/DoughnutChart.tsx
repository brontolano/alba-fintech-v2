'use client';

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  data: any;
  options?: any;
}

export function DoughnutChart({ data, options }: DoughnutChartProps) {
  return <Doughnut data={data} options={options} />;
}