import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotAuthorized from "./NotAuthorized";

describe("NotAuthorized", () => {
  it("renders not authorized message", () => {
    render(<NotAuthorized />);
    expect(screen.getByText(/notauthorized/i)).toBeInTheDocument();
  });
});
