"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChart = ({ accounts }) => {
  if (!accounts || accounts.length === 0) return null;

  const data = {
    labels: accounts.map((a) => a.name),
    datasets: [
      {
        data: accounts.map((a) => a.currentBalance),
        backgroundColor: ["#6D28D9", "#7C3AED", "#8B5CF6"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <Doughnut
      data={data}
      options={{
        cutout: "80%",
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      }}
    />
  );
};

export default DoughnutChart;
