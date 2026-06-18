import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

/**
 * Task 3.1.2 — Passos de tokens e organização (RED).
 * Valida integração com `/api/installer/validate-tokens` e `/list-orgs`,
 * mensagens PT-BR inline e bloqueio de avanço.
 */

function mockFetchOnce(handler: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const body = handler(url, init);
    const status = (body as { status?: number })?.status ?? 200;
    const { status: _omit, ...payload } = body as Record<string, unknown>;
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn as unknown as typeof fetch);
  return fn;
}

describe("OnboardingWizard — validação de tokens e orgs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("passo 1: cola token válido → valida e habilita Avançar", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchOnce(() => ({
      vercel: true,
      supabase: true,
    }));
    renderWithProviders(<OnboardingWizard />);

    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /vercel\.com\/account\/tokens/i }),
      ).toBeTruthy(),
    );

    const input = screen.getByLabelText(/token da vercel/i);
    await user.type(input, "vercel-token-valido");
    await user.click(screen.getByRole("button", { name: /validar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/installer/validate-tokens",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/token da vercel confirmado/i)).toBeTruthy();
    });
  });

  it("passo 1: token inválido → mensagem PT-BR inline e avanço bloqueado", async () => {
    const user = userEvent.setup();
    mockFetchOnce(() => ({
      vercel: false,
      supabase: true,
      error: "Token da Vercel inválido ou expirado.",
    }));
    renderWithProviders(<OnboardingWizard />);

    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /vercel\.com\/account\/tokens/i }),
      ).toBeTruthy(),
    );
    const input = screen.getByLabelText(/token da vercel/i);
    await user.type(input, "token-errado");
    await user.click(screen.getByRole("button", { name: /validar/i }));

    await waitFor(() => {
      expect(screen.getByText(/token da vercel inv[aá]lido/i)).toBeTruthy();
    });
    // Botão Avançar segue desabilitado.
    const next = screen.getByRole("button", {
      name: /avançar|pr[oó]ximo/i,
    }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("passo 1: link de onde pegar o token da Vercel está presente", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    const link = screen.getByRole("link", {
      name: /vercel\.com\/account\/tokens/i,
    });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toContain("vercel.com/account/tokens");
  });

  it("passo 2: link de onde pegar o token do Supabase", async () => {
    const user = userEvent.setup();
    // Passo 1 — já validado.
    mockFetchOnce(() => ({ vercel: true, supabase: true }));
    renderWithProviders(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /vercel\.com\/account\/tokens/i }),
      ).toBeTruthy(),
    );
    const vercelInput = screen.getByLabelText(/token da vercel/i);
    await user.type(vercelInput, "abc");
    await user.click(screen.getByRole("button", { name: /validar/i }));
    await waitFor(() =>
      expect(screen.getByText(/token da vercel confirmado/i)).toBeTruthy(),
    );
    await user.click(screen.getByRole("button", { name: /avan[cç]ar/i }));

    // Passo 2 — Supabase.
    await waitFor(() =>
      expect(
        screen.getByRole("link", {
          name: /supabase\.com\/dashboard\/account\/tokens/i,
        }),
      ).toBeTruthy(),
    );
    const link = screen.getByRole("link", {
      name: /supabase\.com\/dashboard\/account\/tokens/i,
    });
    expect(link.getAttribute("href")).toContain(
      "supabase.com/dashboard/account/tokens",
    );
  });

  it("passo 3: popula dropdown de orgs via list-orgs", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/validate-tokens")) {
        return new Response(JSON.stringify({ vercel: true, supabase: true }), {
          status: 200,
        });
      }
      if (url.endsWith("/list-orgs")) {
        return new Response(
          JSON.stringify({
            orgs: [
              { id: "org_1", name: "Minha Empresa" },
              { id: "org_2", name: "Outra Org" },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /vercel\.com\/account\/tokens/i }),
      ).toBeTruthy(),
    );
    await user.type(screen.getByLabelText(/token da vercel/i), "v");
    await user.click(screen.getByRole("button", { name: /validar/i }));
    await waitFor(() =>
      expect(screen.getByText(/token da vercel confirmado/i)).toBeTruthy(),
    );
    await user.click(screen.getByRole("button", { name: /avan[cç]ar/i }));

    // Passo 2 — Supabase
    await waitFor(() =>
      expect(
        screen.getByRole("link", {
          name: /supabase\.com\/dashboard\/account\/tokens/i,
        }),
      ).toBeTruthy(),
    );
    await user.type(screen.getByLabelText(/token do supabase/i), "s");
    await user.click(screen.getByRole("button", { name: /validar/i }));
    await waitFor(() =>
      expect(screen.getByText(/token do supabase confirmado/i)).toBeTruthy(),
    );
    await user.click(screen.getByRole("button", { name: /avan[cç]ar/i }));

    // Passo 3 — dropdown populado
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/installer/list-orgs",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/minha empresa/i)).toBeTruthy();
    });
  });

  it("passo 3: sem org → mensagem clara", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/validate-tokens")) {
        return new Response(JSON.stringify({ vercel: true, supabase: true }), {
          status: 200,
        });
      }
      if (url.endsWith("/list-orgs")) {
        return new Response(JSON.stringify({ orgs: [] }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithProviders(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /vercel\.com\/account\/tokens/i }),
      ).toBeTruthy(),
    );
    await user.type(screen.getByLabelText(/token da vercel/i), "v");
    await user.click(screen.getByRole("button", { name: /validar/i }));
    await waitFor(() =>
      expect(screen.getByText(/token da vercel confirmado/i)).toBeTruthy(),
    );
    await user.click(screen.getByRole("button", { name: /avan[cç]ar/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("link", {
          name: /supabase\.com\/dashboard\/account\/tokens/i,
        }),
      ).toBeTruthy(),
    );
    await user.type(screen.getByLabelText(/token do supabase/i), "s");
    await user.click(screen.getByRole("button", { name: /validar/i }));
    await waitFor(() =>
      expect(screen.getByText(/token do supabase confirmado/i)).toBeTruthy(),
    );
    await user.click(screen.getByRole("button", { name: /avan[cç]ar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/nenhuma organiza[çc][ãa]o encontrada/i),
      ).toBeTruthy();
    });
  });
});
