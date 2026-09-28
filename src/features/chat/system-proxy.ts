import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
export interface SystemProxyService { name: string; webEnabled: boolean; secureEnabled: boolean; endpoint?: string; }

async function networkSetup(args: string[]) { return run("networksetup", args, { timeout: 10_000, maxBuffer: 128_000 }); }
function field(output: string, label: string) { return output.match(new RegExp(`^${label}:\\s*(.+)$`, "mi"))?.[1]?.trim(); }
function endpoint(output: string) {
  const host = field(output, "Server"); const port = field(output, "Port");
  return host && port ? `http://${host}:${port}` : undefined;
}
async function statusFor(name: string): Promise<SystemProxyService> {
  const [web, secure] = await Promise.all([networkSetup(["-getwebproxy", name]), networkSetup(["-getsecurewebproxy", name])]);
  return { name, webEnabled: field(web.stdout, "Enabled") === "Yes", secureEnabled: field(secure.stdout, "Enabled") === "Yes", endpoint: endpoint(web.stdout) || endpoint(secure.stdout) };
}
export async function getSystemProxyServices(): Promise<{ supported: boolean; services: SystemProxyService[]; error?: string }> {
  if (process.platform !== "darwin") return { supported: false, services: [], error: "System proxy control is currently available only on macOS." };
  try {
    const { stdout } = await networkSetup(["-listallnetworkservices"]);
    const names = stdout.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("An asterisk"));
    return { supported: true, services: await Promise.all(names.map(statusFor)) };
  } catch (caught) { return { supported: false, services: [], error: caught instanceof Error ? "macOS did not allow Signal to inspect network proxy settings." : "Could not inspect macOS proxy settings." }; }
}
export async function setSystemProxy(service: string, enabled: boolean, proxyEndpoint?: string): Promise<SystemProxyService> {
  if (process.platform !== "darwin") throw new Error("System proxy control is currently available only on macOS.");
  const available = await getSystemProxyServices();
  if (!available.services.some((item) => item.name === service)) throw new Error("Choose a valid network service.");
  if (!enabled) {
    await networkSetup(["-setwebproxystate", service, "off"]);
    await networkSetup(["-setsecurewebproxystate", service, "off"]);
    return statusFor(service);
  }
  if (!proxyEndpoint || !URL.canParse(proxyEndpoint)) throw new Error("Enter a valid proxy URL before enabling the system proxy.");
  const url = new URL(proxyEndpoint); const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (!url.hostname || (url.protocol !== "http:" && url.protocol !== "https:")) throw new Error("The proxy URL must use http:// or https://.");
  await networkSetup(["-setwebproxy", service, url.hostname, port]);
  await networkSetup(["-setsecurewebproxy", service, url.hostname, port]);
  await networkSetup(["-setwebproxystate", service, "on"]);
  await networkSetup(["-setsecurewebproxystate", service, "on"]);
  return statusFor(service);
}
