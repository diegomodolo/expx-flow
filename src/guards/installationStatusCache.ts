export interface InstallationStatus {
  configured: boolean;
  reason?: string;
}

let cachedStatus: InstallationStatus | null = null;

export function getCachedInstallationStatus(): InstallationStatus | null {
  return cachedStatus;
}

export function setCachedInstallationStatus(status: InstallationStatus): void {
  cachedStatus = status;
}

export function resetInstallationStatusCache(): void {
  cachedStatus = null;
}

/**
 * Invalida o cache de status de instalação (módulo). Usado pelo wizard do
 * `/onboarding` após criar o admin (Fase 3.2): ao invalidar, o próximo mount
 * do `<InstallationGuard>` refaz `GET /api/installer/status` — que agora
 * retorna `{ configured: true }` — liberando o app.
 *
 * Também dispara o evento custom `installation-status-invalidated` na window
 * para que um `<InstallationGuard>` já montado (que rodou o useEffect apenas
 * uma vez no mount) refaça o fetch sem precisar de remount. Sem isso, clicar
 * em "Entrar" no passo Concluído não liberava o app porque o guard continuava
 * com o status antigo em memória.
 */
export function invalidateInstallationStatus(): void {
  cachedStatus = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("installation-status-invalidated"));
  }
}
