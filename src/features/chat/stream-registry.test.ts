import { describe, expect, it } from "vitest";
import { StreamRegistry } from "./stream-registry";

describe("stream registry", () => {
  it("keeps cancellation scoped to each session", () => {
    const streams = new StreamRegistry();
    const first = streams.start("first");
    const second = streams.start("second");
    streams.stop("first");
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });

  it("does not let an earlier request release a replacement controller", () => {
    const streams = new StreamRegistry();
    const earlier = streams.start("session");
    const current = streams.start("session");
    streams.release("session", earlier);
    streams.stop("session");
    expect(current.signal.aborted).toBe(true);
  });
});
