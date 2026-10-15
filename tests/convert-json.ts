import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  ContractToBpmnService,
  createContractFlowAST,
  ContractFlowInput
} from '../src';

async function convertJsonToBpmn(): Promise<void> {
  const jsonPath = process.argv[2] || 'wedding.json';
  const resolvedPath = path.resolve(process.cwd(), jsonPath);

  console.log(`Reading JSON from: ${resolvedPath}`);
  const rawContent = await fs.readFile(resolvedPath, 'utf8');
  const input = JSON.parse(rawContent) as ContractFlowInput;

  // 1. Build AST from JSON input
  const ast = createContractFlowAST(input);

  // 2. Generate BPMN XML with auto-layout
  const bpmnService = new ContractToBpmnService();
  const xml = await bpmnService.generateXML(ast, { applyAutoLayout: true });

  // Optional: If an output file path is passed as the 2nd argument, write there too
  const customOutputPath = process.argv[3];
  if (customOutputPath) {
    const resolvedOutputPath = path.resolve(process.cwd(), customOutputPath);
    await fs.writeFile(resolvedOutputPath, xml, 'utf8');
    console.log(`Custom output written to: ${resolvedOutputPath}`);
  }

  console.log('Conversion complete!');
}

convertJsonToBpmn().catch(error => {
  console.error('Error converting JSON to BPMN XML:', error);
  process.exitCode = 1;
});
