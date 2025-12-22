"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
    { month: "Jan", webflowx: 120, notion: 80,  discord: 95,  others: 60 },
    { month: "Feb", webflowx: 220, notion: 110, discord: 130, others: 75 },
    { month: "Mar", webflowx: 360, notion: 145, discord: 165, others: 90 },
    { month: "Apr", webflowx: 520, notion: 180, discord: 190, others: 105 },
    { month: "May", webflowx: 740, notion: 215, discord: 210, others: 120 },
    { month: "Jun", webflowx: 1000, notion: 250, discord: 225, others: 135 },
  ];
  

export function TeamGrowthChartSection() {
  return (
    <section className="w-full container mt-32">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Teams Scale Faster with WebflowX
        </h2>
        <p className="mt-4 text-neutral-500 dark:text-neutral-400 text-base md:text-lg">
          A unified workflow outperforms fragmented tools. See how teams grow
          over time when collaboration, execution, and communication live in one place.
        </p>
      </div>

      {/* Chart */}
      <div className="w-full h-105">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="month"
              stroke="#888888"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.8)",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
              }}
            />

            {/* WebflowX – dominant */}
            <Line
              type="monotone"
              dataKey="webflowx"
              stroke="#f97316" // orange-500
              strokeWidth={3}
              dot={false}
            />

            {/* Others – supporting */}
            <Line
              type="monotone"
              dataKey="notion"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="discord"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="others"
              stroke="#9ca3af"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
