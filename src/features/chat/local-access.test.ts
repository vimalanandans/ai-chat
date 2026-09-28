import { describe, expect, it } from "vitest";
import { localOnlyResponse } from "./local-access";

function request(headers: Record<string, string>) { return new Request("http://localhost:3000/api/chat", { headers }); }

describe("local API boundary", () => {
  it("allows a browser request made through loopback", () => {
    expect(localOnlyResponse(request({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBeUndefined();
  });

  it("rejects non-loopback hosts and forwarded clients", () => {
    expect(localOnlyResponse(request({ host: "signal.example.test" }))?.status).toBe(403);
    expect(localOnlyResponse(request({ host: "localhost:3000", "x-forwarded-for": "203.0.113.10" }))?.status).toBe(403);
  });
});
