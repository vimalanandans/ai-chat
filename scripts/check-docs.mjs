import { access, readFile } from "node:fs/promises";

const documents = ["README.md", "docs/README.md", "docs/PRODUCT_CONCEPT.md", "docs/USER_GUIDE.md", "docs/ARCHITECTURE.md", "docs/API_REFERENCE.md", "docs/OPERATIONS.md"];
const secretPattern = /(?:sk|AIza)[-_A-Za-z0-9]{12,}/;
const missing = [];

for (const file of documents) {
  try {
    await access(file);
    const content = await readFile(file, "utf8");
    if (secretPattern.test(content)) throw new Error(`${file} appears to contain a secret-like token.`);
  } catch (error) { missing.push(error instanceof Error ? error.message : `Could not verify ${file}.`); }
}

if (missing.length) {
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log(`Documentation check passed for ${documents.length} files.`);
