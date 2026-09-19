"use client";

import { Calendar, Download, Filter } from "lucide-react";
import { UnitAgg } from "@/components/dashboard/useDashboardData";

interface RangeFilterProps {
  activeRange: "today" | "7d" | "30d" | "90d";
  onChange: (range: "today" | "7d" | "30d" | "90d") => void;
  units: UnitAgg[];
  selectedUnit: string;
  onUnitChange: (unitId: string) => void;
  onExport: () => void;
}

export function RangeFilter({
  activeRange,
  onChange,
  units,
  selectedUnit,
  onUnitChange,
  onExport,
}: RangeFilterProps) {
  return (
    <div className="mb-space-5 flex flex-col gap-space-3">
      <div className="flex items-center gap-space-2 overflow-x-auto no-scrollbar pb-1">
        <Calendar size={18} className="text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-1 bg-muted rounded-radius-lg p-1 flex-shrink-0">
          {(["today", "7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => onChange(range)}
              className={`px-3 py-1 rounded-radius-md text-xs font-medium transition whitespace-nowrap ${
                activeRange === range
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {range === "today"
                ? "Hari Ini"
                : range === "7d"
                  ? "7 Hari"
                  : range === "30d"
                    ? "30 Hari"
                    : "90 Hari"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-space-2">
        <div className="relative flex-1">
          <select
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="appearance-none w-full pl-3 pr-8 py-1.5 border border-border rounded-radius-lg focus:ring-2 focus:ring-primary focus:outline-none text-xs bg-background text-foreground"
          >
            <option value="">Semua Unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <Filter
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-radius-lg hover:bg-muted transition text-xs text-foreground"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
