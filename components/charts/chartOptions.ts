import type { ChartOptions } from "chart.js";

type Fmt = (n: number) => string;

// Format angka dengan inisial: M=Jutaan, K/Rb=Ribuan, Jt=Juta, dll
export function formatNumber(value: number): string {
  if (value >= 1000000000) return (value / 1000000000).toFixed(1) + " M";
  if (value >= 100000000) return (value / 100000000).toFixed(1) + " Rb (100M)";
  if (value >= 10000000) return (value / 10000000).toFixed(1) + " Jt";
  if (value >= 1000000) return (value / 1000000).toFixed(1) + " M";
  if (value >= 100000) return (value / 100000).toFixed(1) + " Rb (100K)";
  if (value >= 10000) return (value / 10000).toFixed(1) + " Rb";
  if (value >= 1000) return (value / 1000).toFixed(1) + " K";
  return value.toFixed(0);
}

const baseGrid = {
  display: true,
  color: "hsl(var(--border))",
  lineDash: [4, 4],
};

export function barChartOptions(formatCurrency?: Fmt): ChartOptions<"bar"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        align: "center",
        labels: {
          usePointStyle: true,
          padding: 12,
          font: {
            size: 11,
            family: "sans-serif",
          },
          color: "hsl(var(--muted-foreground))",
        },
      },
      tooltip: formatCurrency
        ? {
            enabled: true,
            backgroundColor: "hsl(var(--background))",
            titleColor: "hsl(var(--foreground))",
            bodyColor: "hsl(var(--muted-foreground))",
            borderColor: "hsl(var(--border))",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y ?? 0))}`,
            },
          }
        : undefined,
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "hsl(var(--muted-foreground))",
          font: { size: 10 },
        },
      },
      y: {
        grid: {
          display: false,
        },
        beginAtZero: true,
        ticks: formatCurrency
          ? {
              callback: (value) => formatCurrency(Number(value)),
              color: "hsl(var(--muted-foreground))",
              font: { size: 10 },
            }
          : {
              color: "hsl(var(--muted-foreground))",
              font: { size: 10 },
            },
      },
    },
  };
}

export function doughnutChartOptions(
  formatCurrency?: Fmt,
): ChartOptions<"doughnut"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "55%",
    plugins: {
      legend: {
        position: "bottom",
        align: "center",
        labels: {
          usePointStyle: true,
          padding: 10,
          boxWidth: 8,
          font: {
            size: 10,
            family: "sans-serif",
          },
          color: "hsl(var(--muted-foreground))",
        },
      },
      tooltip: formatCurrency
        ? {
            enabled: true,
            backgroundColor: "hsl(var(--background))",
            titleColor: "hsl(var(--foreground))",
            bodyColor: "hsl(var(--muted-foreground))",
            borderColor: "hsl(var(--border))",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: ${formatCurrency(Number(ctx.parsed ?? 0))}`,
            },
          }
        : undefined,
    },
  };
}
