import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import React from "react";
import { renderWithProviders } from "@/test/test-utils";
import { InstallationGuard } from "@/guards/InstallationGuard";
import { resetInstallationStatusCache } from "@/guards/installationStatusCache";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">PATH:{location.pathname}</div>;
}

function renderGuard(initialPath: string) {
  window.history.replaceState({}, "", initialPath);
  return renderWithProviders(
    <InstallationGuard>
      <LocationProbe />
    </InstallationGuard>,
  );
}

describe("InstallationGuard", () => {
  beforeEach(() => {
    resetInstallationStatusCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetInstallationStatusCache();
  });

  it("mostra o spinner de carregamento enquanto busca o status", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    const { getByTestId } = renderGuard("/dashboard");

    expect(getByTestId("installation-guard-loading")).toBeTruthy();
  });

  it("redireciona para /onboarding quando configured=false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ configured: false, reason: "no-env" }),
            {
              status: 200,
            },
          ),
      ) as unknown as typeof fetch,
    );

    const { getByTestId } = renderGuard("/dashboard");

    await waitFor(() => {
      expect(getByTestId("location-probe").textContent).toBe(
        "PATH:/onboarding",
      );
    });
  });

  it("redireciona para / quando configured=true e está em /onboarding", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ configured: true }), { status: 200 }),
      ) as unknown as typeof fetch,
    );

    const { getByTestId } = renderGuard("/onboarding");

    await waitFor(() => {
      expect(getByTestId("location-probe").textContent).toBe("PATH:/");
    });
  });

  it("mantém o app acessível quando configured=true em rota comum", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ configured: true }), { status: 200 }),
      ) as unknown as typeof fetch,
    );

    const { getByTestId } = renderGuard("/dashboard");

    await waitFor(() => {
      expect(getByTestId("location-probe").textContent).toBe("PATH:/dashboard");
    });
  });

  it("mantém /onboarding acessível quando configured=false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ configured: false, reason: "not-installed" }),
            { status: 200 },
          ),
      ) as unknown as typeof fetch,
    );

    const { getByTestId } = renderGuard("/onboarding");

    await waitFor(() => {
      expect(getByTestId("location-probe").textContent).toBe(
        "PATH:/onboarding",
      );
    });
  });

  it("cacheia o resultado: segunda montagem não refaz fetch", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ configured: true }), { status: 200 }),
    ) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    const first = renderGuard("/dashboard");
    await waitFor(() => {
      expect(first.getByTestId("location-probe").textContent).toBe(
        "PATH:/dashboard",
      );
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    first.unmount();

    const second = renderGuard("/tarefas");
    await waitFor(() => {
      expect(second.getByTestId("location-probe").textContent).toBe(
        "PATH:/tarefas",
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
