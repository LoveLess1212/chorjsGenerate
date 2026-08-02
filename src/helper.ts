import { Ids } from "ids";
import * as fs from "node:fs/promises"
const ids = new Ids([32, 36]);
const DEFAULT_PATH = "../resources/bpmn";
function generateId(prefix: string): string {
  return ids.nextPrefixed(prefix);
}

async function writeFile(content: string, name: string = "generated.bpmn", path: string = DEFAULT_PATH): Promise<void> {
  const fullPath = `${path}/${name}`;
  await fs.writeFile(fullPath, content);
}

export { generateId, writeFile };
