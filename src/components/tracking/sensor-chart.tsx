"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SensorPoint {
  at: string;
  tempC: number;
  humidityPct: number;
}

export function SensorChart({
  readings,
  targetTempC,
}: {
  readings: SensorPoint[];
  targetTempC: number | null;
}) {
  const t = useTranslations("tracking");
  const format = useFormatter();

  if (readings.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-6 text-sm">
        {t("sensor.noData")}
      </p>
    );
  }

  const data = readings.map((r) => ({
    ts: Date.parse(r.at),
    temp: r.tempC,
    humidity: r.humidityPct,
  }));

  const fmtTick = (ts: number) =>
    format.dateTime(new Date(ts), { day: "2-digit", month: "short" });

  return (
    <div className="h-[260px] w-full" data-testid="sensor-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={fmtTick}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            minTickGap={40}
          />
          <YAxis
            yAxisId="temp"
            width={44}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            unit="°"
          />
          <YAxis
            yAxisId="hum"
            orientation="right"
            width={40}
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            unit="%"
          />
          <Tooltip
            labelFormatter={(ts) =>
              format.dateTime(new Date(Number(ts)), {
                dateStyle: "medium",
                timeStyle: "short",
              })
            }
            formatter={(value, name) => [
              name === "temp" ? `${value} °C` : `${value} %`,
              name === "temp" ? t("sensor.temp") : t("sensor.humidity"),
            ]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
          />
          {targetTempC !== null && (
            <ReferenceLine
              yAxisId="temp"
              y={targetTempC}
              stroke="var(--chart-1)"
              strokeDasharray="4 4"
              label={{
                value: t("sensor.target"),
                fontSize: 10,
                fill: "var(--muted-foreground)",
                position: "insideTopRight",
              }}
            />
          )}
          <Line
            yAxisId="hum"
            dataKey="humidity"
            name="humidity"
            stroke="var(--chart-3)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="temp"
            dataKey="temp"
            name="temp"
            stroke="var(--harvest)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
