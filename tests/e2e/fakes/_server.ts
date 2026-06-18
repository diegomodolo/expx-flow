import http from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Helper compartilhado: sobe um servidor HTTP real (node:http) numa porta
 * livre (porta 0) para que cada fake seja isolado e determinístico.
 *
 * O fake fornece um `router` que recebe (req, body, ctx) e devolve
 * `{ status, body }` ou `undefined` (404). O helper cuida de ler o corpo,
 * serializar JSON, tratar erros e fechar o servidor.
 */
export interface FakeRequestCtx {
  method: string;
  pathname: string;
  query: URLSearchParams;
  headers: http.IncomingHttpHeaders;
}

export type FakeRouteResult = { status: number; body?: unknown } | undefined;

export type FakeRouter = (
  ctx: FakeRequestCtx,
  body: unknown,
) => Promise<FakeRouteResult> | FakeRouteResult;

export interface FakeServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export async function startHttpServer(router: FakeRouter): Promise<FakeServer> {
  const server = http.createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const raw = Buffer.concat(chunks).toString("utf-8");
      let body: unknown = undefined;
      if (raw.length > 0) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
      }
      const fullUrl = req.url ?? "/";
      const [pathname, search = ""] = fullUrl.split("?");
      const ctx: FakeRequestCtx = {
        method: req.method ?? "GET",
        pathname,
        query: new URLSearchParams(search),
        headers: req.headers,
      };
      const result = await router(ctx, body);
      if (!result) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found", path: pathname }));
        return;
      }
      res.writeHead(result.status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      });
      res.end(result.body === undefined ? "" : JSON.stringify(result.body));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
  });

  // CORS preflight: responde OPTIONS sem chamar o router.
  server.on("request", (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      });
      res.end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  const port = addr.port;
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

/** Helper de autorização Bearer. Retorna true se o token for válido. */
export function isAuthorized(
  headers: http.IncomingHttpHeaders,
  validToken: string,
): boolean {
  const auth = headers.authorization ?? "";
  return auth === `Bearer ${validToken}`;
}
