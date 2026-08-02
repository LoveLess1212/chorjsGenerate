import * as fs from 'node:fs/promises';
import { ContractToBpmnService } from './services/generate';
import { createContractFlowAST } from './interface';
import { OpenAIContractFlowClient } from './services/ai/openai-contract-flow-client';

const SAMPLE_CONTRACT_TEXT = `
Jade Hotel will provide a room with a balcony and a view of the sea. If the hotel cannot arrange a sea view room as promised, it shall arrange an alternative room with a luxurious interior design, or a king-size double bed. If this compensation option is unavailable, Jade Hotel will offer two adult members of the tourist family free access to the hotel's spa during their stay. If neither of these compensations could be made, the tourist is entitled to a 50% discount on her accommodation at Jade Hotel upon checkout.
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
