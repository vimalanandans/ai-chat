import { describe, expect, it } from "vitest";
import { sessionData } from "./demo-data";
import { canTransitionRun, hasScope, resolveChangeSet } from "./logic";

describe("agent-run state machine", () => {
  it("allows review gates but never resumes a completed run", () => {
    expect(canTransitionRun("running", "waiting_for_approval")).toBe(true);
    expect(canTransitionRun("completed", "running")).toBe(false);
  });
});

describe("reviewable changes", () => {
  const proposal = sessionData[0].artifacts[0].changeSet!;

  it("preserves original content on rejection", () => {
    const result = resolveChangeSet(proposal, "rejected");
    expect(result.resolvedContent).toBe(proposal.original);
    expect(result.status).toBe("rejected");
  });

  it("uses only the declared context scope", () => {
    expect(hasScope(proposal.scope, "Website refresh")).toBe(true);
    expect(hasScope(proposal.scope, "Private workspace notes")).toBe(false);
  });
});
