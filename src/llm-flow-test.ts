import * as fs from 'node:fs/promises';
import { ContractToBpmnService } from './services/generate';
import { createContractFlowAST } from './interface';
import { OpenAIContractFlowClient } from './services/ai/openai-contract-flow-client';

const SAMPLE_CONTRACT_TEXT = `
To ensure your vehicle is ready upon arrival, we recommend booking in advance so we can coordinate with our local garages. We always aim to provide the exact vehicle class you reserved. In the rare event that your requested model is unavailable, we will automatically upgrade you to a higher model within the same segment in a neutral color at no extra charge. If an upgrade isn't available, we will provide a comparable vehicle class in a neutral color, waive all [Trusted Insurer] insurance fees, and include any requested accessories (like child safety seats) for free. Finally, if we cannot deliver a qualifying vehicle within 120 minutes of your arrival, you will receive a compensation package from [Trusted Insurer], scaled according to your membership tier.
`;

async function runLlmFlowTest(): Promise<void> {
  const contractText = await resolveContractText();
  const client = new OpenAIContractFlowClient();
  const input = await client.generateContractFlow(contractText);
  const ast = createContractFlowAST(input);
  await new ContractToBpmnService().generateXML(ast, { applyAutoLayout: true });

  console.log('Generated BPMN file under resource/<DDMMYYYY>');
}

async function resolveContractText(): Promise<string> {
  const inputPath = process.argv[2];

  if (!inputPath) {
    return SAMPLE_CONTRACT_TEXT.trim();
  }

  return fs.readFile(inputPath, 'utf8');
}

runLlmFlowTest().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
