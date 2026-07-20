"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const ACCENT = "#2563eb";
const GRID = "#e5e5e5";
const TEXT = "#9ca3af";
const PIE_COLORS = ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <span className="text-xs font-medium text-neutral-500">{title}</span>
      {children}
    </div>
  );
}

export function StatBarChart({
  title,
  data,
  emptyLabel,
  onPointClick,
}: {
  title: string;
  data: { label: string; value: number }[];
  emptyLabel: string;
  onPointClick?: (label: string) => void;
}) {
  return (
    <ChartCard title={title}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-xs text-neutral-400">{emptyLabel}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="value"
              fill={ACCENT}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              className={onPointClick ? "cursor-pointer" : undefined}
              onClick={(item) => {
                const label = (item.payload as { label?: string } | undefined)?.label;
                if (onPointClick && label !== undefined) onPointClick(label);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function StatLineChart({
  title,
  data,
  emptyLabel,
  onPointClick,
}: {
  title: string;
  data: { label: string; value: number }[];
  emptyLabel: string;
  onPointClick?: (label: string) => void;
}) {
  return (
    <ChartCard title={title}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-xs text-neutral-400">{emptyLabel}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            className={onPointClick ? "cursor-pointer" : undefined}
            onClick={(state) => {
              if (onPointClick && state.activeLabel !== undefined) onPointClick(String(state.activeLabel));
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function StatPieChart({
  title,
  data,
  emptyLabel,
  onPointClick,
}: {
  title: string;
  data: { label: string; value: number }[];
  emptyLabel: string;
  onPointClick?: (label: string) => void;
}) {
  return (
    <ChartCard title={title}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-xs text-neutral-400">{emptyLabel}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name }) => name}
              isAnimationActive={false}
              className={onPointClick ? "cursor-pointer" : undefined}
              onClick={(item) => {
                const label = (item.payload as { label?: string } | undefined)?.label;
                if (onPointClick && label !== undefined) onPointClick(label);
              }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
