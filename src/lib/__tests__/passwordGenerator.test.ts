import { describe, it, expect } from "vitest";
import { generateSecurePassword } from "../passwordGenerator";

describe("generateSecurePassword", () => {
  it("gera senha com comprimento padrao de 12", () => {
    const password = generateSecurePassword();
    expect(password.length).toBe(12);
  });

  it("gera senha com comprimento customizado", () => {
    const password = generateSecurePassword(20);
    expect(password.length).toBe(20);
  });

  it("contem pelo menos uma letra maiuscula", () => {
    const password = generateSecurePassword(12);
    expect(password).toMatch(/[A-Z]/);
  });

  it("contem pelo menos uma letra minuscula", () => {
    const password = generateSecurePassword(12);
    expect(password).toMatch(/[a-z]/);
  });

  it("contem pelo menos um numero", () => {
    const password = generateSecurePassword(12);
    expect(password).toMatch(/[0-9]/);
  });

  it("contem pelo menos um simbolo", () => {
    const password = generateSecurePassword(12);
    expect(password).toMatch(/[!@#$%&*+\-=?]/);
  });

  it("nao contem caracteres confusos (I, O, l, 0, 1)", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 50; i++) {
      const password = generateSecurePassword(20);
      expect(password).not.toMatch(/[IOl01]/);
    }
  });

  it("gera senhas diferentes a cada chamada", () => {
    const passwords = new Set(
      Array.from({ length: 10 }, () => generateSecurePassword()),
    );
    expect(passwords.size).toBeGreaterThan(1);
  });
});
