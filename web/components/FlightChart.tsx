"use client";
// Revision: 1. Numeric-time charts preserve every sample and missing-data gaps.
import { useEffect, useRef } from "react";
import type { Flight } from "../lib/engine";
import { timeLabel } from "../lib/engine";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  AriaComponent,
  CanvasRenderer,
]);
export default function FlightChart({
  flight,
  codes,
  title,
  alarms,
  focus,
}: {
  flight: Flight;
  codes: string[];
  title: string;
  alarms: Record<string, [number | null, number | null]>;
  focus: [number, number] | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.EChartsType | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const instance = echarts.init(container.current);
    chart.current = instance;
    const channels = flight.channels.filter((channel) =>
      codes.includes(channel.code),
    );
    const unitList = [...new Set(channels.map((channel) => channel.unit))];
    instance.setOption({
      animation: false,
      color: [
        "#236a53",
        "#d58432",
        "#6079c1",
        "#ac5880",
        "#8a9635",
        "#5394ac",
        "#d16b55",
        "#8472a8",
      ],
      aria: {
        enabled: true,
        label: {
          description: `${title} for flight ${flight.id}. Elapsed time in seconds. Sample readings are available in the table below.`,
        },
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        valueFormatter: (value: unknown) =>
          value == null ? "Missing" : String(value),
      },
      legend: {
        type: "scroll",
        bottom: 0,
        textStyle: { color: "#536258", fontSize: 11 },
      },
      grid: {
        top: 40,
        right: unitList.length > 1 ? 75 : 26,
        bottom: 94,
        left: 66,
      },
      xAxis: {
        type: "value",
        name: "Elapsed time",
        min: 0,
        max: Math.max(1, flight.duration),
        axisLabel: { formatter: timeLabel },
        splitLine: { show: false },
      },
      yAxis: unitList.map((unit, index) => ({
        type: "value",
        name: unit || "Value",
        scale: true,
        position: index % 2 ? "right" : "left",
        offset: Math.floor(index / 2) * 48,
        splitLine: { show: index === 0, lineStyle: { color: "#edf1ec" } },
      })),
      dataZoom: [
        { type: "inside", filterMode: "none" },
        { type: "slider", bottom: 36, height: 20, borderColor: "#dce5dc" },
      ],
      series: channels.map((channel) => {
        const category = /^C\d+$/.test(channel.code)
          ? "CHT"
          : /^T\d+$/.test(channel.code)
            ? "TIT"
            : channel.code;
        const limits = alarms[category] ?? [null, null];
        return {
          name: `${channel.label}${channel.unit ? ` (${channel.unit})` : ""}`,
          type: "line",
          showSymbol: false,
          connectNulls: false,
          yAxisIndex: unitList.indexOf(channel.unit),
          lineStyle: { width: 1.5 },
          data: flight.elapsed.map((elapsed, i) => [
            elapsed,
            flight.series[channel.code][i],
          ]),
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { color: "#b34a43", type: "dashed", width: 1 },
            label: { show: false },
            data: limits
              .filter((value) => value !== null)
              .map((value) => ({ yAxis: value })),
          },
        };
      }),
    });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, [flight, codes, alarms, title]);
  useEffect(() => {
    if (focus && chart.current)
      chart.current.dispatchAction({
        type: "dataZoom",
        startValue: Math.max(0, focus[0] - 30),
        endValue: Math.min(flight.duration, focus[1] + 30),
      });
  }, [focus, flight.duration]);
  return (
    <section className="panel chart-panel">
      <div className="section-title">
        <h2>{title}</h2>
        <span className="muted">Drag to zoom · click legend to toggle</span>
      </div>
      <div
        ref={container}
        className="chart"
        role="img"
        aria-label={`${title} for flight ${flight.id}. Elapsed time on the horizontal axis. A sample table is available below.`}
      />
    </section>
  );
}
