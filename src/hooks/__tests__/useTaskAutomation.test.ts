import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

import { mapAlertTypeToTaskType } from "../useTaskAutomation";

describe("mapAlertTypeToTaskType", () => {
  it("mapeia 'danger' para 'high_cpa'", () => {
    expect(mapAlertTypeToTaskType("danger")).toBe("high_cpa");
  });

  it("mapeia 'critical' para 'high_cpa'", () => {
    expect(mapAlertTypeToTaskType("critical")).toBe("high_cpa");
  });

  it("mapeia 'warning' para 'performance_issue'", () => {
    expect(mapAlertTypeToTaskType("warning")).toBe("performance_issue");
  });

  it("mapeia 'opportunity' para 'scale_opportunity'", () => {
    expect(mapAlertTypeToTaskType("opportunity")).toBe("scale_opportunity");
  });

  it("mapeia tipo desconhecido para 'general_issue'", () => {
    expect(mapAlertTypeToTaskType("info")).toBe("general_issue");
  });

  it("mapeia string vazia para 'general_issue'", () => {
    expect(mapAlertTypeToTaskType("")).toBe("general_issue");
  });

  it("mapeia tipo arbitrario para 'general_issue'", () => {
    expect(mapAlertTypeToTaskType("custom_type")).toBe("general_issue");
  });
});
