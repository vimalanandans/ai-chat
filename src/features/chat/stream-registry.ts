/** Owns in-flight chat requests by session, preventing one stream from
 * accidentally replacing another session's Stop control. */
export class StreamRegistry {
  private readonly controllers = new Map<string, AbortController>();

  start(sessionId: string) {
    const controller = new AbortController();
    this.controllers.set(sessionId, controller);
    return controller;
  }

  stop(sessionId: string) { this.controllers.get(sessionId)?.abort(); }

  release(sessionId: string, controller: AbortController) {
    if (this.controllers.get(sessionId) === controller) this.controllers.delete(sessionId);
  }

  clear() {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }
}
