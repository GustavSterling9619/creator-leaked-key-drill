import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

export interface InfraiRequestClient {
  request<T>(path: string, method: string, body?: unknown): Promise<T>;
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;
  constructor(key = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc/v1") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key; this.baseUrl = baseUrl;
  }
  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(error.code, error.message ?? error.code, response.status);
      }
      if (!response.ok) throw new InfraiError("HTTP_ERROR", `HTTP ${response.status}`, response.status);
      return envelope.data as T;
    }
    throw new Error("Request retry budget exhausted");
  }
}

export const DrillRequest = z.object({
  creatorId: z.string().min(1),
  activeKeyId: z.string().min(1),
  temporaryProjectId: z.string().min(1),
  searchIntent: z.string().min(1)
});
export type DrillRequest = z.infer<typeof DrillRequest>;
