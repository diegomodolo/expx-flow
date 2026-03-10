import { describe, it, expect } from "vitest";
import { stripWhatsAppFormatting } from "../whatsappFormatting";

describe("stripWhatsAppFormatting", () => {
  it("remove bold (*texto*)", () => {
    expect(stripWhatsAppFormatting("*negrito*")).toBe("negrito");
  });

  it("remove italic (_texto_)", () => {
    expect(stripWhatsAppFormatting("_italico_")).toBe("italico");
  });

  it("remove strikethrough (~texto~)", () => {
    expect(stripWhatsAppFormatting("~riscado~")).toBe("riscado");
  });

  it("remove code (`texto`)", () => {
    expect(stripWhatsAppFormatting("`codigo`")).toBe("codigo");
  });

  it("remove multiplas formatacoes no mesmo texto", () => {
    expect(stripWhatsAppFormatting("*bold* e _italic_ e ~strike~")).toBe(
      "bold e italic e strike",
    );
  });

  it("mantem texto sem formatacao inalterado", () => {
    expect(stripWhatsAppFormatting("texto normal")).toBe("texto normal");
  });

  it("retorna string vazia para string vazia", () => {
    expect(stripWhatsAppFormatting("")).toBe("");
  });

  it("retorna null/undefined como recebido", () => {
    expect(stripWhatsAppFormatting(null as unknown as string)).toBeNull();
    expect(
      stripWhatsAppFormatting(undefined as unknown as string),
    ).toBeUndefined();
  });
});
