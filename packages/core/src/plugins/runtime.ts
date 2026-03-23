import { Buffer } from "node:buffer";

export interface HttpRequestSnapshot {
  method: string;
  url: URL;
  headers: Headers;
  body: ArrayBuffer | null;
}

export interface HttpRequestState {
  method: string;
  url: URL;
  headers: Headers;
  body: ArrayBuffer | null;
}

export interface HttpResponseState {
  status: number;
  statusText: string;
  headers: Headers;
  body: ArrayBuffer | null;
  source: "upstream" | "gateway";
}

export async function readRequestBody(request: Request): Promise<ArrayBuffer | null> {
  if (request.method === "GET" || request.method === "HEAD") {
    return null;
  }

  const body = await request.arrayBuffer();
  return cloneArrayBuffer(body);
}

export async function toResponseState(
  response: Response,
  source: "upstream" | "gateway",
): Promise<HttpResponseState> {
  const body = response.body ? cloneArrayBuffer(await response.arrayBuffer()) : null;

  return {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
    body,
    source,
  };
}

export function toFetchRequest(state: HttpRequestState): Request {
  const init: RequestInit = {
    method: state.method,
    headers: new Headers(state.headers),
    redirect: "manual",
  };

  if (state.method !== "GET" && state.method !== "HEAD" && state.body) {
    init.body = cloneArrayBuffer(state.body);
    (init as RequestInit & { duplex?: "half" }).duplex = "half";
  }

  return new Request(state.url.toString(), init);
}

export function toResponse(state: HttpResponseState): Response {
  return new Response(state.body ? cloneArrayBuffer(state.body) : null, {
    status: state.status,
    statusText: state.statusText,
    headers: new Headers(state.headers),
  });
}

export function cloneRequestSnapshot(snapshot: HttpRequestSnapshot): HttpRequestSnapshot {
  return {
    method: snapshot.method,
    url: new URL(snapshot.url.toString()),
    headers: new Headers(snapshot.headers),
    body: snapshot.body ? cloneArrayBuffer(snapshot.body) : null,
  };
}

export function createRequestState(snapshot: HttpRequestSnapshot): HttpRequestState {
  return {
    method: snapshot.method,
    url: new URL(snapshot.url.toString()),
    headers: new Headers(snapshot.headers),
    body: snapshot.body ? cloneArrayBuffer(snapshot.body) : null,
  };
}

export function cloneArrayBuffer(body: ArrayBuffer): ArrayBuffer {
  return body.slice(0);
}

export function readBodyText(body: ArrayBuffer | null): string {
  if (!body) {
    return "";
  }

  return Buffer.from(body).toString("utf-8");
}

export function writeBodyText(text: string): ArrayBuffer {
  const buffer = Buffer.from(text, "utf-8");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function isJsonContentType(contentType?: string | null): boolean {
  if (!contentType) {
    return false;
  }

  return /\bjson\b/i.test(contentType);
}

export function readJsonObject(body: ArrayBuffer | null): Record<string, unknown> | null {
  if (!body) {
    return {};
  }

  const text = readBodyText(body).trim();
  if (!text) {
    return {};
  }

  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return { ...(parsed as Record<string, unknown>) };
}

export function writeJsonObject(
  target: {
    body: ArrayBuffer | null;
    headers: Headers;
  },
  value: Record<string, unknown>,
): void {
  target.body = writeBodyText(JSON.stringify(value));
  target.headers.set("content-type", "application/json");
  target.headers.delete("content-length");
}

export function appendVaryHeader(headers: Headers, value: string): void {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", value);
    return;
  }

  const parts = existing
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.some((part) => part.toLowerCase() === value.toLowerCase())) {
    parts.push(value);
  }

  headers.set("vary", parts.join(", "));
}
