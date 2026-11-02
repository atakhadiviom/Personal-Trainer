import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WeightProjectionChart from "../components/Dashboard/WeightProjectionChart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-points={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe("WeightProjectionChart", () => {
  it("returns null if weight is not provided", () => {
    const { container } = render(<WeightProjectionChart weight={null} goal="fatloss" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders projection chart when weight is provided", () => {
    render(<WeightProjectionChart weight="80" goal="fatloss" />);
    expect(screen.getByText("12-Week Weight Projection")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("computes 12 weekly data points with downward trend for fatloss", () => {
    render(<WeightProjectionChart weight="80" goal="fatloss" />);
    const chart = screen.getByTestId("line-chart");
    const data = JSON.parse(chart.getAttribute("data-points"));
    expect(data).toHaveLength(12);
    expect(data[0].week).toBe("W1");
    expect(data[0].weight).toBe(80);
    expect(data[11].week).toBe("W12");
    expect(data[11].weight).toBeLessThan(80);
  });

  it("computes upward trend for muscle goal", () => {
    render(<WeightProjectionChart weight="70" goal="muscle" />);
    const chart = screen.getByTestId("line-chart");
    const data = JSON.parse(chart.getAttribute("data-points"));
    expect(data[0].weight).toBe(70);
    expect(data[11].weight).toBeGreaterThan(70);
  });

  it("adjusts deficit rate when dynamicTDEE is supplied", () => {
    render(<WeightProjectionChart weight="90" goal="fatloss" dynamicTDEE={2500} />);
    const chart = screen.getByTestId("line-chart");
    const data = JSON.parse(chart.getAttribute("data-points"));
    expect(data).toHaveLength(12);
    expect(data[0].weight).toBe(90);
    expect(data[11].weight).toBeLessThan(90);
  });
});
