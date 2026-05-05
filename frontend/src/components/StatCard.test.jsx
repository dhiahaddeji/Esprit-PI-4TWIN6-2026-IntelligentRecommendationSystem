import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders title", () => {
    render(<StatCard title="Total Employees" value={42} pill="HR" />);
    expect(screen.getByText("Total Employees")).toBeInTheDocument();
  });

  it("renders numeric value", () => {
    render(<StatCard title="Activities" value={15} pill="Active" />);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders pill text", () => {
    render(<StatCard title="Score" value={90} pill="+5%" />);
    expect(screen.getByText("+5%")).toBeInTheDocument();
  });

  it("renders with zero value", () => {
    render(<StatCard title="Pending" value={0} pill="None" />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders with string value", () => {
    render(<StatCard title="Status" value="Running" pill="OK" />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });
});
