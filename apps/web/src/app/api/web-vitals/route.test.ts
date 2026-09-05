import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/web-vitals/route";

describe("POST /api/web-vitals", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("logs a validated metric without query parameters", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await POST(
      new Request("http://localhost/api/web-vitals", {
        method: "POST",
        body: JSON.stringify({
          id: "v4-1",
          name: "LCP",
          value: 1234.5,
          rating: "good",
          navigationType: "navigate",
          path: "/players/8478402",
          routeView: "trends",
          routePhase: "regular",
        }),
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      event: "web-vital",
      name: "LCP",
      path: "/players/8478402",
      routeView: "trends",
      routePhase: "regular",
    });
  });

  it("rejects unknown, malformed, or query-bearing metrics", async () => {
    for (const body of [
      "not json",
      JSON.stringify({ name: "CUSTOM", value: 1, id: "x", path: "/" }),
      JSON.stringify({ name: "CLS", value: 0.1, id: "x", path: "/?secret=x" }),
      JSON.stringify({
        name: "INP",
        value: 250,
        id: "x",
        path: "/teams/26",
        routeView: "../../secret",
      }),
    ]) {
      const response = await POST(
        new Request("http://localhost/api/web-vitals", {
          method: "POST",
          body,
        }),
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects oversized payloads before parsing", async () => {
    const response = await POST(
      new Request("http://localhost/api/web-vitals", {
        method: "POST",
        headers: { "Content-Length": "2049" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(413);
  });
});

describe("web-vitals input boundaries", () => {
  it("does not log extra properties or let clients override the event", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await POST(new Request("http://localhost/api/web-vitals", {
      method: "POST",
      body: JSON.stringify({ id: "x", name: "CLS", value: 0, path: "/", event: "forged", secret: "private" }),
    }));
    expect(response.status).toBe(204);
    const entry = JSON.parse(String(log.mock.calls.at(-1)?.[0]));
    expect(entry.event).toBe("web-vital");
    expect(entry).not.toHaveProperty("secret");
    log.mockRestore();
  });

  it("limits actual UTF-8 bytes with missing or understated Content-Length", async () => {
    for (const headers of [new Headers(), new Headers({ "Content-Length": "1" })]) {
      const response = await POST(new Request("http://localhost/api/web-vitals", {
        method: "POST", headers,
        body: JSON.stringify({ id: "x", name: "CLS", value: 0, path: "/", extra: "é".repeat(1024) }),
      }));
      expect(response.status).toBe(413);
    }
  });

  it("cancels a chunked body as soon as it exceeds the limit", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024));
        controller.enqueue(new Uint8Array(1025));
      },
      cancel,
    });
    const request = new Request("http://localhost/api/web-vitals", {
      method: "POST", body, duplex: "half",
    } as RequestInit);
    expect((await POST(request)).status).toBe(413);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("rejects fragments that could contain private client state", async () => {
    const response = await POST(new Request("http://localhost/api/web-vitals", {
      method: "POST",
      body: JSON.stringify({ id: "x", name: "CLS", value: 0, path: "/#private" }),
    }));
    expect(response.status).toBe(400);
  });
});
