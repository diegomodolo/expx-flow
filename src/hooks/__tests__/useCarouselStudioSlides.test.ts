/**
 * Testes para useCarouselStudioSlides
 *
 * Foco: Causa 1 — flushAll envia o objeto completo em vez do patch acumulado.
 *
 * Reproduz a race condition onde dois updateSlide chamados em rápida sucessão
 * para campos diferentes resultam em apenas um dos campos sendo persistido.
 *
 * O teste "deve enviar apenas os campos alterados, não o objeto slide inteiro"
 * FALHA com a implementação original (flushAll usa slide inteiro do cache)
 * e PASSA com a implementação corrigida (flushAll usa patch acumulado via Map<id, {timer, patch}>).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Spies hoistados — devem ser criados com vi.hoisted para poder usar nos mocks
// ---------------------------------------------------------------------------
const { updateMock, eqAfterUpdateMock, orderMock } = vi.hoisted(() => {
  const eqAfterUpdateMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn().mockReturnValue({ eq: eqAfterUpdateMock });

  const slideMockData = [
    {
      id: "slide-1",
      project_id: "project-abc",
      slide_number: 1,
      headline: "Titulo Original",
      subtitle: "Subtitulo Original",
      visual_description: null,
      bg_image_url: null,
      bg_position_x: 50,
      bg_position_y: 50,
      bg_zoom: 1,
      overlay_style: "none",
      overlay_opacity: 0.3,
      text_position: "center",
      text_alignment: "left",
      font_size_title: 48,
      font_size_subtitle: 24,
      line_spacing: 1.2,
      line_spacing_subtitle: 1.2,
      title_subtitle_gap: 12,
      corner_style: "none",
      corner_opacity: 0.5,
      glass_enabled: false,
      glass_radius: 8,
      badge_enabled: false,
      badge_photo_url: null,
      badge_position: "bottom_center",
      badge_size: 80,
      badge_handle_enabled: false,
      badge_handle_position: "below",
      exported_image_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  const orderMock = vi
    .fn()
    .mockResolvedValue({ data: slideMockData, error: null });

  return { updateMock, eqAfterUpdateMock, orderMock };
});

// ---------------------------------------------------------------------------
// Mock do Supabase — deve usar apenas variáveis hoistadas
// ---------------------------------------------------------------------------
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: orderMock,
          }),
        }),
        update: updateMock,
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// Mocks obrigatórios (global.md + testing.md)
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "teste@expx.com.br" },
    session: { access_token: "mock-token" },
    loading: false,
  }),
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    activeCompany: { company_id: "company-1", name: "Empresa Teste" },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import do hook — após os mocks
// ---------------------------------------------------------------------------
import { useCarouselStudioSlides } from "../useCarouselStudioSlides";
import { createWrapper } from "@/test/test-utils";

// ---------------------------------------------------------------------------
// Dados auxiliares para slide de dois slides
// ---------------------------------------------------------------------------
const DOIS_SLIDES_DATA = [
  {
    id: "slide-1",
    project_id: "project-abc",
    slide_number: 1,
    headline: "Slide 1",
    subtitle: null,
    visual_description: null,
    bg_image_url: null,
    bg_position_x: 50,
    bg_position_y: 50,
    bg_zoom: 1,
    overlay_style: "none",
    overlay_opacity: 0.3,
    text_position: "center",
    text_alignment: "left",
    font_size_title: 48,
    font_size_subtitle: 24,
    line_spacing: 1.2,
    line_spacing_subtitle: 1.2,
    title_subtitle_gap: 12,
    corner_style: "none",
    corner_opacity: 0.5,
    glass_enabled: false,
    glass_radius: 8,
    badge_enabled: false,
    badge_photo_url: null,
    badge_position: "bottom_center",
    badge_size: 80,
    badge_handle_enabled: false,
    badge_handle_position: "below",
    exported_image_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "slide-2",
    project_id: "project-abc",
    slide_number: 2,
    headline: "Slide 2",
    subtitle: null,
    visual_description: null,
    bg_image_url: null,
    bg_position_x: 50,
    bg_position_y: 50,
    bg_zoom: 1,
    overlay_style: "none",
    overlay_opacity: 0.3,
    text_position: "center",
    text_alignment: "left",
    font_size_title: 48,
    font_size_subtitle: 24,
    line_spacing: 1.2,
    line_spacing_subtitle: 1.2,
    title_subtitle_gap: 12,
    corner_style: "none",
    corner_opacity: 0.5,
    glass_enabled: false,
    glass_radius: 8,
    badge_enabled: false,
    badge_photo_url: null,
    badge_position: "bottom_center",
    badge_size: 80,
    badge_handle_enabled: false,
    badge_handle_position: "below",
    exported_image_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("useCarouselStudioSlides — flushAll e patch acumulado", () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reconfigurar mocks após clearAllMocks
    eqAfterUpdateMock.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: eqAfterUpdateMock });
    orderMock.mockResolvedValue({
      data: [
        {
          id: "slide-1",
          project_id: "project-abc",
          slide_number: 1,
          headline: "Titulo Original",
          subtitle: "Subtitulo Original",
          visual_description: null,
          bg_image_url: null,
          bg_position_x: 50,
          bg_position_y: 50,
          bg_zoom: 1,
          overlay_style: "none",
          overlay_opacity: 0.3,
          text_position: "center",
          text_alignment: "left",
          font_size_title: 48,
          font_size_subtitle: 24,
          line_spacing: 1.2,
          line_spacing_subtitle: 1.2,
          title_subtitle_gap: 12,
          corner_style: "none",
          corner_opacity: 0.5,
          glass_enabled: false,
          glass_radius: 8,
          badge_enabled: false,
          badge_photo_url: null,
          badge_position: "bottom_center",
          badge_size: 80,
          badge_handle_enabled: false,
          badge_handle_position: "below",
          exported_image_url: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve persistir ambos os campos ao chamar flushAll após dois updateSlide em rápida sucessão", async () => {
    /*
     * Cenário que reproduz o bug:
     * 1. updateSlide('slide-1', { headline: 'Titulo Novo' })
     * 2. updateSlide('slide-1', { subtitle: 'Subtitulo Novo' })  ← cancela o timer do primeiro
     * 3. flushAll() → deve chamar update com { headline, subtitle }
     *
     * Implementação BUGADA: o segundo updateSlide cancela o timer do primeiro via clearTimeout.
     * Quando flushAll é chamado, há apenas um timer (do segundo call) e faz update(slide_inteiro).
     * O slide inteiro inclui ambos os campos (porque o cache foi atualizado otimisticamente por
     * ambos os updateSlide), MAS envia dezenas de campos extras desnecessariamente.
     *
     * Mais importante: o patch no setTimeout do primeiro call foi DESCARTADO — se o flushAll
     * não fosse chamado e o debounce disparasse, apenas o segundo patch ({ subtitle }) seria
     * persistido, perdendo o { headline }.
     *
     * Implementação CORRIGIDA: debounceRefs armazena { timer, patch }. Os patches são merged.
     * flushAll envia apenas o patch acumulado { headline, subtitle }.
     */
    const capturedPatches: Record<string, unknown>[] = [];
    updateMock.mockImplementation((patch: Record<string, unknown>) => {
      capturedPatches.push({ ...patch });
      return { eq: eqAfterUpdateMock };
    });

    const { result } = renderHook(
      () => useCarouselStudioSlides("project-abc"),
      { wrapper },
    );

    // Aguardar o useQuery carregar os slides
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Chamar updateSlide duas vezes em rápida sucessão (dentro da janela de debounce)
    act(() => {
      result.current.updateSlide("slide-1", { headline: "Titulo Novo" });
      result.current.updateSlide("slide-1", { subtitle: "Subtitulo Novo" });
    });

    // flushAll cancela os debounces e persiste imediatamente
    await act(async () => {
      await result.current.flushAll();
    });

    // Deve ter chamado update exatamente uma vez (um flush para o slide-1)
    expect(updateMock).toHaveBeenCalledTimes(1);

    // O patch enviado deve conter AMBOS os campos alterados
    expect(capturedPatches).toHaveLength(1);
    const patchEnviado = capturedPatches[0];

    expect(patchEnviado).toHaveProperty("headline", "Titulo Novo");
    expect(patchEnviado).toHaveProperty("subtitle", "Subtitulo Novo");
  });

  it("deve enviar apenas os campos alterados, não o objeto slide inteiro (implementação corrigida)", async () => {
    /*
     * Verifica que o patch NÃO contém campos que não foram alterados.
     *
     * Com a implementação BUGADA: flushAll faz update(slide_inteiro) — o objeto completo
     * do cache com ~30 campos (id, project_id, slide_number, bg_zoom, overlay_opacity...).
     * Este teste FALHA na implementação bugada porque o patch contém campos extras.
     *
     * Com a implementação CORRIGIDA: update recebe apenas { headline, subtitle }.
     * Este teste PASSA na implementação corrigida.
     */
    const capturedPatches: Record<string, unknown>[] = [];
    updateMock.mockImplementation((patch: Record<string, unknown>) => {
      capturedPatches.push({ ...patch });
      return { eq: eqAfterUpdateMock };
    });

    const { result } = renderHook(
      () => useCarouselStudioSlides("project-abc"),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.updateSlide("slide-1", { headline: "Titulo Novo" });
      result.current.updateSlide("slide-1", { subtitle: "Subtitulo Novo" });
    });

    await act(async () => {
      await result.current.flushAll();
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const patchEnviado = capturedPatches[0];

    // Campos alterados DEVEM estar presentes
    expect(patchEnviado).toHaveProperty("headline", "Titulo Novo");
    expect(patchEnviado).toHaveProperty("subtitle", "Subtitulo Novo");

    // Campos NÃO alterados NÃO devem estar no patch.
    // A presença de qualquer um destes indica que o slide inteiro foi enviado (bug).
    expect(patchEnviado).not.toHaveProperty("id");
    expect(patchEnviado).not.toHaveProperty("project_id");
    expect(patchEnviado).not.toHaveProperty("slide_number");
    expect(patchEnviado).not.toHaveProperty("bg_zoom");
    expect(patchEnviado).not.toHaveProperty("overlay_opacity");
    expect(patchEnviado).not.toHaveProperty("font_size_title");
    expect(patchEnviado).not.toHaveProperty("created_at");
    expect(patchEnviado).not.toHaveProperty("updated_at");
  });

  it("não deve chamar update ao flushAll sem updateSlide pendente", async () => {
    /*
     * Caso base: sem mudanças pendentes, flushAll não deve disparar nenhum update.
     */
    const { result } = renderHook(
      () => useCarouselStudioSlides("project-abc"),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await result.current.flushAll();
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("deve aplicar o patch ao banco quando o debounce disparar normalmente", async () => {
    /*
     * Verifica que o patch correto é enviado quando o timer do debounce dispara
     * (sem flushAll). Este é o caminho feliz sem race condition.
     */
    const capturedPatches: Record<string, unknown>[] = [];
    updateMock.mockImplementation((patch: Record<string, unknown>) => {
      capturedPatches.push({ ...patch });
      return { eq: eqAfterUpdateMock };
    });

    const { result } = renderHook(
      () => useCarouselStudioSlides("project-abc"),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // updateSlide sem flushAll — aguarda o debounce de 2s disparar
    act(() => {
      result.current.updateSlide("slide-1", { headline: "Via Debounce" });
    });

    // Avança o timer para disparar o debounce (2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2001);
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(capturedPatches[0]).toHaveProperty("headline", "Via Debounce");
  });

  it("deve limpar o debounce ao chamar flushAll, evitando duplo update", async () => {
    /*
     * Verifica que flushAll cancela o timer pendente para não haver um segundo
     * update quando o debounce natural eventualmente dispararia.
     */
    const capturedPatches: Record<string, unknown>[] = [];
    updateMock.mockImplementation((patch: Record<string, unknown>) => {
      capturedPatches.push({ ...patch });
      return { eq: eqAfterUpdateMock };
    });

    const { result } = renderHook(
      () => useCarouselStudioSlides("project-abc"),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.updateSlide("slide-1", { headline: "Titulo Flush" });
    });

    // flushAll persiste imediatamente e limpa o timer
    await act(async () => {
      await result.current.flushAll();
    });

    // Avança o timer além do debounce — não deve haver segundo update
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // update deve ter sido chamado apenas uma vez (pelo flushAll, não pelo debounce)
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(capturedPatches).toHaveLength(1);
  });

  it("deve fazer update de slides independentes separadamente ao chamar flushAll", async () => {
    /*
     * Verifica que quando dois slides distintos têm mudanças pendentes,
     * flushAll gera um update para cada um — não um único update combinado.
     */
    orderMock.mockResolvedValueOnce({ data: DOIS_SLIDES_DATA, error: null });

    const capturedArgs: { patch: Record<string, unknown>; id: string }[] = [];
    const eqCapture = vi.fn((field: string, value: string) => {
      // Registra o id passado ao .eq('id', slideId)
      if (field === "id") {
        capturedArgs[capturedArgs.length - 1].id = value;
      }
      return eqAfterUpdateMock();
    });
    updateMock.mockImplementation((patch: Record<string, unknown>) => {
      capturedArgs.push({ patch: { ...patch }, id: "" });
      return { eq: eqCapture };
    });

    const { result } = renderHook(
      () => useCarouselStudioSlides("project-abc"),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Atualizar dois slides distintos
    act(() => {
      result.current.updateSlide("slide-1", { headline: "Novo Slide 1" });
      result.current.updateSlide("slide-2", { headline: "Novo Slide 2" });
    });

    await act(async () => {
      await result.current.flushAll();
    });

    // Dois updates: um para cada slide
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(capturedArgs).toHaveLength(2);
  });
});
