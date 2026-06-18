/**
 * Helpers HTTP compartilhados pelos handlers Vercel do instalador
 * (`api/installer/*`). Mantém CORS, leitura de body e tipos de req/res
 * consistentes entre handlers. Node runtime, sem dependências externas.
 */

export interface VercelRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  /** Body já parseado (alguns runtimes populam). Tem precedência sobre stream. */
  body?: unknown;
  /** Stream legível (Node IncomingMessage). */
  on?(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

/** Aplica headers CORS básicos (same-origin no deploy, mas seguro por padrão). */
export function applyCors(res: VercelResponse): void {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

/** True quando a request é um preflight CORS. */
export function isOptions(req: VercelRequest): boolean {
  return req.method === "OPTIONS";
}

/**
 * Lê e parseia o body JSON da request. Se `req.body` já vier populado
 * (atalho de teste), usa-o diretamente; caso contrário lê do stream.
 * Retorna `null` para body vazio.
 */
export function readJsonBody(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined) return Promise.resolve(req.body);
  if (!req.on) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on!("data", (chunk: unknown) => {
      chunks.push(
        typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer),
      );
    });
    req.on!("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on!("error", reject);
  });
}
