import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const documents = [
  "README.md", "docs/README.md", "docs/PRODUCT_CONCEPT.md", "docs/USER_GUIDE.md",
  "docs/WORKSPACE_UX.md", "docs/ARCHITECTURE.md", "docs/API_REFERENCE.md",
  "docs/OPERATIONS.md", "docs/architecture/adr-001-context-engine.md",
];
const secretPattern = /(?:sk|AIza)[-_A-Za-z0-9]{12,}/;
const errors = [];
const contents = new Map();

for (const file of documents) {
  try {
    const content = await readFile(file, "utf8");
    contents.set(file, content);
    if (secretPattern.test(content)) errors.push(`${file} appears to contain a secret-like token.`);
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const destination = match[1].replace(/^<|>$/g, "").split("#")[0];
      if (!destination || /^[a-z][a-z\d+.-]*:/i.test(destination)) continue;
      const target = resolve(dirname(file), decodeURIComponent(destination));
      try { await access(target); }
      catch { errors.push(`${file} links to missing ${destination}.`); }
    }
  } catch { errors.push(`Missing or unreadable documentation: ${file}.`); }
}

async function routeFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await routeFiles(path));
    else if (entry.name === "route.ts") files.push(path);
  }
  return files;
}

if (contents.has("docs/API_REFERENCE.md")) {
  const documented = new Set();
  for (const [, heading] of contents.get("docs/API_REFERENCE.md").matchAll(/^### (.+)$/gm)) {
    const match = heading.replaceAll("`", "").match(/^(.+) (\/api\/\S+)/);
    if (match) for (const method of match[1].split(/,\s*/)) documented.add(`${method} ${match[2].split("?")[0]}`);
  }
  for (const file of await routeFiles("src/app/api")) {
    const route = `/api/${relative("src/app/api", dirname(file)).replaceAll("\\", "/")}`;
    const source = await readFile(file, "utf8");
    for (const [, method] of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g)) {
      if (!documented.has(`${method} ${route}`)) errors.push(`Undocumented route: ${method} ${route}.`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Documentation check passed for ${documents.length} files and all API route methods.`);
}
