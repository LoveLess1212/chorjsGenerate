import * as fs from 'node:fs/promises';
import {
  ContractToBpmnService,
  createContractFlowAST,
  OpenAIContractFlowClient
} from '..';

const SAMPLE_CONTRACT_TEXT = `
This is a penalty rule involving five participants: two couples sharing the same joint wedding service (Couple 1 and Couple 2), Vendor-A for furniture and tenting, Vendor-B for audio-visual and lighting equipment, and Vendor-C for catering and food. Prior to the wedding event, if Vendor-A fails to install furniture and tenting as agreed upon previously, specifically if the delivery is delayed more than one hour but does not lead to a disruption of the wedding event, Vendor-A must issue an immediate 25% rental fee credit split equally between the two couples within 7 business days; if the delay directly disrupts the joint event schedule by more than 30 minutes, the compensation escalates to a 50% refund of Vendor-A's total contract value, divided equally between both couples. During the wedding event just before the last hours when the invited guests eat and socialize, if the supplied audio-visual apparatus turns defective or the lighting equipment fails, Vendor-B must provide a functional replacement within 90 minutes; failure to remedy this on-site results in an 80% full refund of the rental cost plus a $300 operational failure fee payable jointly and divided equally between Couple 1 and Couple 2. During the last hour of the shared wedding event, Vendor-C must serve all scheduled courses and meals according to the agreed-upon event timeline; if the food service fails to arrive or is rendered unconsumable, Vendor-C must supply an alternative meal as per the previously specified backup menu, failing which results in Vendor-C issuing a 100% full refund of the catering contract value plus covering liquidated damages up to $500 for alternative emergency food arrangements, with all funds distributed equally among both couples within 5 business days.  `;

async function runLlmFlowTest(): Promise<void> {
  const contractText = await resolveContractText();
  const client = new OpenAIContractFlowClient();
  const inputs = await client.generateContractFlow(contractText);
  const service = new ContractToBpmnService();

  for (const input of inputs) {
    const ast = createContractFlowAST(input);
    await service.generateXML(ast, { applyAutoLayout: true });
  }

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
