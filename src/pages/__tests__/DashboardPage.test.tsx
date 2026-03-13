import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import DashboardPage from "../DashboardPage";

// Mock do componente CommunicationDashboard para focar apenas no DashboardPage
vi.mock("../CommunicationDashboard", () => ({
  default: () => <div data-testid="communication-dashboard">Dashboard Mock</div>,
}));

describe("DashboardPage", () => {
  it("deve renderizar corretamente e incluir CommunicationDashboard", () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId("communication-dashboard")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Mock")).toBeInTheDocument();
  });
});
