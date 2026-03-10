import { describe, it, expect } from "vitest";
import {
  calculatePercentageChange,
  calculateConversionRate,
  formatCurrency,
  formatPercentage,
  getTemperatureLabel,
  getTemperatureColor,
} from "../crmReportUtils";

describe("calculatePercentageChange", () => {
  it("calcula aumento percentual", () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });

  it("calcula queda percentual", () => {
    expect(calculatePercentageChange(50, 100)).toBe(-50);
  });

  it("retorna 100 quando anterior e zero e atual e positivo", () => {
    expect(calculatePercentageChange(10, 0)).toBe(100);
  });

  it("retorna 0 quando ambos sao zero", () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });

  it("retorna valor com 1 casa decimal", () => {
    expect(calculatePercentageChange(133, 100)).toBe(33);
  });
});

describe("calculateConversionRate", () => {
  it("calcula taxa de conversao", () => {
    expect(calculateConversionRate(25, 100)).toBe(25);
  });

  it("retorna 0 quando total e zero", () => {
    expect(calculateConversionRate(0, 0)).toBe(0);
  });

  it("retorna 100 quando todos converteram", () => {
    expect(calculateConversionRate(50, 50)).toBe(100);
  });
});

describe("formatCurrency", () => {
  it("formata valor em BRL", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1.234,56");
    expect(result).toContain("R$");
  });

  it("formata zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0,00");
  });

  it("formata valor negativo", () => {
    const result = formatCurrency(-100);
    expect(result).toContain("100,00");
  });
});

describe("formatPercentage", () => {
  it("formata com 1 casa decimal por padrao", () => {
    expect(formatPercentage(75.123)).toBe("75.1%");
  });

  it("formata com casas decimais customizadas", () => {
    expect(formatPercentage(75.123, 2)).toBe("75.12%");
  });

  it("formata zero", () => {
    expect(formatPercentage(0)).toBe("0.0%");
  });
});

describe("getTemperatureLabel", () => {
  it("capitaliza temperatura", () => {
    expect(getTemperatureLabel("quente")).toBe("Quente");
    expect(getTemperatureLabel("frio")).toBe("Frio");
  });

  it("retorna 'Nao definida' para null", () => {
    expect(getTemperatureLabel(null)).toBe("Não definida");
  });
});

describe("getTemperatureColor", () => {
  it("retorna vermelho para quente", () => {
    expect(getTemperatureColor("quente")).toBe("#ef4444");
  });

  it("retorna laranja para morno", () => {
    expect(getTemperatureColor("morno")).toBe("#f97316");
  });

  it("retorna azul para frio", () => {
    expect(getTemperatureColor("frio")).toBe("#3b82f6");
  });

  it("retorna cinza para null", () => {
    expect(getTemperatureColor(null)).toBe("#6b7280");
  });

  it("e case insensitive", () => {
    expect(getTemperatureColor("QUENTE")).toBe("#ef4444");
  });
});
