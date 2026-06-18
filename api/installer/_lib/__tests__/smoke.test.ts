import { describe, it, expect } from "vitest";

/**
 * Teste de fumaça: prova que o projeto `node` do Vitest enxerga api/**.
 * Quando as functions do instalador (Fase 1.4+) tiverem testes reais, este
 * placeholder pode ser removido.
 */
describe("api/installer — smoke do projeto node do Vitest", () => {
  it("roda em ambiente node (sem jsdom)", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof process).toBe("object");
  });
});
