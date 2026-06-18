import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import {
  clearStoredProgress,
  storeProgress,
} from "@/components/onboarding/onboardingState";

/**
 * Task 3.1.3 — Passo "Instalando" (SSE + resume) (RED).
 *
 * Como o wizard usa `fetch`+`ReadableStream` para o POST+SSE, mockamos
 * `fetch` para retornar um stream sintético. Quando recebe `partial`, o
 * componente reinvoca `run` automaticamente (enviando progress de volta).
 */

/** Monta um ReadableStream SSE a partir de eventos. */
function makeSseStream(events: object[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      }
      controller.close();
    },
  });
}

function mockSseRun(seqs: ReadableStream<Uint8Array>[]) {
  let callCount = 0;
  const calls: { body: unknown }[] = [];
  const fn = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    calls.push({ body });
    const seq = seqs[Math.min(callCount, seqs.length - 1)];
    callCount++;
    return new Response(seq, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  });
  vi.stubGlobal("fetch", fn as unknown as typeof fetch);
  return { fn, calls };
}

describe('OnboardingWizard — passo "Instalando" (SSE + resume)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    clearStoredProgress();
  });

  it("mostra barra de progresso e nome do step em PT-BR", async () => {
    const user = userEvent.setup();
    const { fn } = mockSseRun([
      makeSseStream([
        { step: "create-project", status: "started", pct: 5 },
        {
          step: "global",
          status: "done",
          pct: 100,
          done: true,
          progress: {
            completedSteps: [
              "create-project",
              "apply-schema",
              "deploy-functions",
              "set-secrets",
              "write-vercel-env",
              "trigger-redeploy",
            ],
            functions: [],
            projectRef: "ref-123",
            startedAt: 1,
            updatedAt: 2,
          },
        },
      ]),
    ]);

    renderWithProviders(<OnboardingWizard __testStartStep={4} />);
    await waitFor(() => {
      expect(fn).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText(/criando projeto supabase/i)).toBeTruthy();
    });
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  it("ao receber done → avança para o passo admin", async () => {
    const user = userEvent.setup();
    mockSseRun([
      makeSseStream([
        {
          step: "global",
          status: "done",
          pct: 100,
          done: true,
          progress: {
            completedSteps: [
              "create-project",
              "apply-schema",
              "deploy-functions",
              "set-secrets",
              "write-vercel-env",
              "trigger-redeploy",
            ],
            functions: [],
            projectRef: "ref-xyz",
            startedAt: 1,
            updatedAt: 2,
          },
        },
      ]),
    ]);

    renderWithProviders(<OnboardingWizard __testStartStep={4} />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /administrador|criar.*admin/i }),
      ).toBeTruthy();
    });
  });

  it("ao receber partial → reinvoca run enviando progress", async () => {
    const { calls, fn } = mockSseRun([
      // Primeira invocação → partial com progress.
      makeSseStream([
        {
          step: "global",
          status: "partial",
          pct: 40,
          done: true,
          resumeFrom: "deploy-functions",
          progress: {
            completedSteps: ["create-project", "apply-schema"],
            functions: ["a"],
            projectRef: "ref-resume",
            startedAt: 1,
            updatedAt: 2,
          },
        },
      ]),
      // Segunda invocação → done.
      makeSseStream([
        {
          step: "global",
          status: "done",
          pct: 100,
          done: true,
          progress: {
            completedSteps: [
              "create-project",
              "apply-schema",
              "deploy-functions",
              "set-secrets",
              "write-vercel-env",
              "trigger-redeploy",
            ],
            functions: ["a", "b"],
            projectRef: "ref-resume",
            startedAt: 1,
            updatedAt: 3,
          },
        },
      ]),
    ]);

    renderWithProviders(<OnboardingWizard __testStartStep={4} />);

    await waitFor(
      () => {
        expect(fn).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );
    // A segunda chamada reenvia o progress da primeira.
    expect(calls[1].body).toHaveProperty("progress");
  });

  it("ao recarregar a página lê progress do sessionStorage e retoma", async () => {
    // Pré-popula sessionStorage com progress parcial (resume do deploy).
    storeProgress({
      completedSteps: ["create-project", "apply-schema"],
      functions: ["a"],
      projectRef: "ref-resume",
      startedAt: 1,
      updatedAt: 2,
    });

    const { fn, calls } = mockSseRun([
      makeSseStream([
        {
          step: "global",
          status: "done",
          pct: 100,
          done: true,
          progress: {
            completedSteps: [
              "create-project",
              "apply-schema",
              "deploy-functions",
              "set-secrets",
              "write-vercel-env",
              "trigger-redeploy",
            ],
            functions: ["a", "b"],
            projectRef: "ref-resume",
            startedAt: 1,
            updatedAt: 3,
          },
        },
      ]),
    ]);

    renderWithProviders(<OnboardingWizard __testStartStep={4} />);

    await waitFor(() => expect(fn).toHaveBeenCalled());
    // A primeira chamada já envia o progress do sessionStorage.
    expect(calls[0].body).toHaveProperty("progress");
    expect(
      (calls[0].body as { projectRef?: string }).projectRef,
    ).toBeUndefined();
    const progress = (calls[0].body as { progress?: { projectRef?: string } })
      .progress;
    expect(progress?.projectRef).toBe("ref-resume");
  });

  it("exibe mensagem de erro PT-BR em caso de falha no stream", async () => {
    const user = userEvent.setup();
    mockSseRun([
      makeSseStream([
        {
          step: "global",
          status: "error",
          pct: 0,
          done: true,
          message: "Falha ao criar projeto Supabase.",
        },
      ]),
    ]);

    renderWithProviders(<OnboardingWizard __testStartStep={4} />);
    await waitFor(() => {
      expect(screen.getByText(/falha ao criar projeto supabase/i)).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: /tentar novamente/i }),
    ).toBeTruthy();
  });
});
