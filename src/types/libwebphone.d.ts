declare class libwebphone {
  constructor(config: Record<string, unknown>): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  onAny(callback: (event: string, ...data: unknown[]) => void): void;
  getUserAgent(): {
    renderAddTarget(config: Record<string, unknown>): void;
  } | null;
}

interface Window {
  libwebphone: typeof libwebphone;
}
