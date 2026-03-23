import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatEur } from '../../pos/utils.js';

interface MonthData {
  month: string;
  umsatz: number;
  spenden: number;
}

interface ReportChartProps {
  data: MonthData[];
}

export function ReportChart({ data }: ReportChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v: number) => `${(v / 100).toFixed(0)}€`} />
        <Tooltip formatter={(v) => formatEur(v as number)} />
        <Legend />
        <Bar dataKey="umsatz" fill="#38bdf8" name="Umsatz" />
        <Bar dataKey="spenden" fill="#86efac" name="Spenden" />
      </BarChart>
    </ResponsiveContainer>
  );
}
