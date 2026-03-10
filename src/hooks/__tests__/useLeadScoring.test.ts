import { describe, it, expect, vi } from "vitest";

// Mock supabase before importing the module
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({ activeCompany: null }),
}));

vi.mock("./useLeadQualificationRules", () => ({
  useLeadQualificationRules: vi
    .fn()
    .mockReturnValue({ rules: [], weights: null, loading: false }),
}));

import {
  evaluateRule,
  calculateDimensionScore,
  isValidEmail,
  isValidBrazilianPhone,
} from "../useLeadScoring";
import type { QualificationRule } from "../useLeadQualificationRules";

function makeRule(
  overrides: Partial<QualificationRule> = {},
): QualificationRule {
  return {
    id: "rule-1",
    company_id: "company-1",
    dimension: "company_fit",
    field: "revenue",
    operator: "=",
    value: "100",
    score_contribution: 10,
    is_active: true,
    rule_order: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

// -----------------------------------------------------------
// evaluateRule
// -----------------------------------------------------------
describe("evaluateRule", () => {
  it("operador '=' compara case insensitive", () => {
    const rule = makeRule({ field: "name", operator: "=", value: "Maria" });
    expect(evaluateRule(rule, { name: "maria" })).toBe(true);
    expect(evaluateRule(rule, { name: "MARIA" })).toBe(true);
    expect(evaluateRule(rule, { name: "João" })).toBe(false);
  });

  it("operador '!=' retorna true quando diferente", () => {
    const rule = makeRule({ field: "status", operator: "!=", value: "ativo" });
    expect(evaluateRule(rule, { status: "inativo" })).toBe(true);
    expect(evaluateRule(rule, { status: "ativo" })).toBe(false);
  });

  it("operador '>' compara numericamente", () => {
    const rule = makeRule({ field: "revenue", operator: ">", value: "100" });
    expect(evaluateRule(rule, { revenue: 200 })).toBe(true);
    expect(evaluateRule(rule, { revenue: 100 })).toBe(false);
    expect(evaluateRule(rule, { revenue: 50 })).toBe(false);
  });

  it("operador '<' compara numericamente", () => {
    const rule = makeRule({ field: "revenue", operator: "<", value: "100" });
    expect(evaluateRule(rule, { revenue: 50 })).toBe(true);
    expect(evaluateRule(rule, { revenue: 100 })).toBe(false);
  });

  it("operador '>=' compara numericamente", () => {
    const rule = makeRule({ field: "score", operator: ">=", value: "50" });
    expect(evaluateRule(rule, { score: 50 })).toBe(true);
    expect(evaluateRule(rule, { score: 51 })).toBe(true);
    expect(evaluateRule(rule, { score: 49 })).toBe(false);
  });

  it("operador '<=' compara numericamente", () => {
    const rule = makeRule({ field: "score", operator: "<=", value: "50" });
    expect(evaluateRule(rule, { score: 50 })).toBe(true);
    expect(evaluateRule(rule, { score: 49 })).toBe(true);
    expect(evaluateRule(rule, { score: 51 })).toBe(false);
  });

  it("operador 'contains' verifica substring case insensitive", () => {
    const rule = makeRule({
      field: "company",
      operator: "contains",
      value: "tech",
    });
    expect(evaluateRule(rule, { company: "TechCorp" })).toBe(true);
    expect(evaluateRule(rule, { company: "TECHNOLOGY" })).toBe(true);
    expect(evaluateRule(rule, { company: "Padaria" })).toBe(false);
  });

  it("operador 'not_null' retorna true para valor presente", () => {
    const rule = makeRule({ field: "email", operator: "not_null" });
    expect(evaluateRule(rule, { email: "user@test.com" })).toBe(true);
    expect(evaluateRule(rule, { email: null })).toBe(false);
    expect(evaluateRule(rule, { email: undefined })).toBe(false);
    expect(evaluateRule(rule, { email: "" })).toBe(false);
  });

  it("operador 'is_null' retorna true para valor ausente", () => {
    const rule = makeRule({ field: "phone", operator: "is_null" });
    expect(evaluateRule(rule, { phone: null })).toBe(true);
    expect(evaluateRule(rule, { phone: undefined })).toBe(true);
    expect(evaluateRule(rule, { phone: "" })).toBe(true);
    expect(evaluateRule(rule, { phone: "123" })).toBe(false);
  });

  it("operador desconhecido retorna false", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = makeRule({ operator: "unknown" as any });
    expect(evaluateRule(rule, { revenue: 100 })).toBe(false);
  });
});

// -----------------------------------------------------------
// calculateDimensionScore
// -----------------------------------------------------------
describe("calculateDimensionScore", () => {
  it("acumula score de regras ativas que passam", () => {
    const rules: QualificationRule[] = [
      makeRule({
        dimension: "company_fit",
        field: "revenue",
        operator: ">",
        value: "100",
        score_contribution: 30,
        is_active: true,
      }),
      makeRule({
        id: "rule-2",
        dimension: "company_fit",
        field: "employees",
        operator: ">",
        value: "10",
        score_contribution: 20,
        is_active: true,
      }),
    ];
    expect(
      calculateDimensionScore("company_fit", rules, {
        revenue: 200,
        employees: 50,
      }),
    ).toBe(50);
  });

  it("ignora regras inativas", () => {
    const rules: QualificationRule[] = [
      makeRule({
        score_contribution: 30,
        is_active: true,
        operator: "not_null",
        field: "email",
      }),
      makeRule({
        id: "r2",
        score_contribution: 50,
        is_active: false,
        operator: "not_null",
        field: "email",
      }),
    ];
    expect(
      calculateDimensionScore("company_fit", rules, { email: "a@b.com" }),
    ).toBe(30);
  });

  it("ignora regras de outra dimensao", () => {
    const rules: QualificationRule[] = [
      makeRule({
        dimension: "company_fit",
        score_contribution: 30,
        operator: "not_null",
        field: "x",
      }),
      makeRule({
        id: "r2",
        dimension: "authority",
        score_contribution: 50,
        operator: "not_null",
        field: "x",
      }),
    ];
    expect(calculateDimensionScore("company_fit", rules, { x: "val" })).toBe(
      30,
    );
  });

  it("normaliza score para maximo 100", () => {
    const rules: QualificationRule[] = [
      makeRule({ score_contribution: 80, operator: "not_null", field: "x" }),
      makeRule({
        id: "r2",
        score_contribution: 80,
        operator: "not_null",
        field: "x",
      }),
    ];
    expect(calculateDimensionScore("company_fit", rules, { x: "val" })).toBe(
      100,
    );
  });

  it("normaliza score para minimo 0", () => {
    const rules: QualificationRule[] = [
      makeRule({ score_contribution: -50, operator: "not_null", field: "x" }),
    ];
    expect(calculateDimensionScore("company_fit", rules, { x: "val" })).toBe(0);
  });
});

// -----------------------------------------------------------
// isValidEmail
// -----------------------------------------------------------
describe("isValidEmail", () => {
  it("aceita email valido", () => {
    expect(isValidEmail("usuario@empresa.com")).toBe(true);
  });

  it("aceita email de dominio generico (gmail, hotmail)", () => {
    expect(isValidEmail("joao@gmail.com")).toBe(true);
    expect(isValidEmail("maria@hotmail.com")).toBe(true);
  });

  it("rejeita null e undefined", () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejeita email sem @", () => {
    expect(isValidEmail("invalido")).toBe(false);
  });

  it("rejeita email sem dominio", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejeita emails de teste/fake", () => {
    expect(isValidEmail("teste@empresa.com")).toBe(false);
    expect(isValidEmail("test123@empresa.com")).toBe(false);
    expect(isValidEmail("fake@empresa.com")).toBe(false);
    expect(isValidEmail("noreply@empresa.com")).toBe(false);
    expect(isValidEmail("temp@empresa.com")).toBe(false);
  });

  it("rejeita local part muito curto", () => {
    expect(isValidEmail("a@empresa.com")).toBe(false);
  });

  it("rejeita caracteres repetidos no local part", () => {
    expect(isValidEmail("aaa@empresa.com")).toBe(false);
    expect(isValidEmail("bbb@empresa.com")).toBe(false);
  });
});

// -----------------------------------------------------------
// isValidBrazilianPhone
// -----------------------------------------------------------
describe("isValidBrazilianPhone", () => {
  it("aceita celular valido com 11 digitos", () => {
    expect(isValidBrazilianPhone("11994738256")).toBe(true);
  });

  it("aceita telefone fixo valido com 10 digitos", () => {
    expect(isValidBrazilianPhone("1134568790")).toBe(true);
  });

  it("aceita telefone formatado", () => {
    expect(isValidBrazilianPhone("(11) 99473-8256")).toBe(true);
  });

  it("rejeita null e undefined", () => {
    expect(isValidBrazilianPhone(null)).toBe(false);
    expect(isValidBrazilianPhone(undefined)).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(isValidBrazilianPhone("")).toBe(false);
  });

  it("rejeita DDD invalido (00)", () => {
    expect(isValidBrazilianPhone("00987654321")).toBe(false);
  });

  it("rejeita telefone muito curto", () => {
    expect(isValidBrazilianPhone("119876")).toBe(false);
  });

  it("rejeita telefone muito longo", () => {
    expect(isValidBrazilianPhone("119876543210")).toBe(false);
  });

  it("rejeita celular sem 9 apos DDD", () => {
    expect(isValidBrazilianPhone("11887654321")).toBe(false);
  });

  it("rejeita numeros repetidos", () => {
    expect(isValidBrazilianPhone("11999999999")).toBe(false);
  });

  it("rejeita numeros sequenciais", () => {
    expect(isValidBrazilianPhone("11912345678")).toBe(false);
  });
});
