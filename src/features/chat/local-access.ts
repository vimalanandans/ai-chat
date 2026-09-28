/**
 * Signal is intentionally a local desktop application. Route handlers use this
 * check as a defense in depth measure; the npm scripts also bind Next to the
 * loopback interface so these routes are not reachable from the LAN.
 */
function stripPort(value: string) {
  const candidate = value.trim().toLowerCase();
  if (candidate === "::1") return candidate;
  if (candidate.startsWith("[")) return candidate.slice(1, candidate.indexOf("]"));
  return candidate.split(":")[0];
}

function isLoopbackHost(value: string | null) {
  if (!value) return false;
  const host = stripPort(value);
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isLoopbackAddress(value: string) {
  const address = stripPort(value);
  return address === "127.0.0.1" || address === "::1";
}

/** Returns a 403 response when a request is not explicitly local. */
export function localOnlyResponse(request: Request): Response | undefined {
  const host = request.headers.get("host");
  if (!isLoopbackHost(host)) {
    return Response.json({ error: "Signal accepts API requests from this computer only." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (!isLoopbackHost(new URL(origin).host)) {
        return Response.json({ error: "Signal accepts API requests from this computer only." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Signal accepts API requests from this computer only." }, { status: 403 });
    }
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor && !forwardedFor.split(",").every((address) => isLoopbackAddress(address))) {
    return Response.json({ error: "Signal accepts API requests from this computer only." }, { status: 403 });
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && !isLoopbackAddress(realIp)) {
    return Response.json({ error: "Signal accepts API requests from this computer only." }, { status: 403 });
  }
}
