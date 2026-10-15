import * as fs from 'node:fs/promises';
import{
    ContractToBpmnService,
    createContractFlowAST,
    OpenAIContractFlowClientV2
} from '../src';

const SAMPLE_CONTRACT_TEXT = `
Titan Truss & Structures Ltd. (Vendor-A) must build the main outdoor stage framework and provide a structural load-bearing certificate to Apex Live Events LLC (Producer) by 10:00 AM on Friday. At the same time, SoundWave Pro Audio Inc. (Vendor-B) must rig the aerial line-array sound system and submit an electrical safety grounding report to the Producer by 12:00 PM on Friday.

The Producer will release the $50,000 Milestone-2 escrow payment—split equally between both vendors—and permit the headliner artist's technical soundcheck only after both Vendor-A submits the structural certificate and Vendor-B submits the electrical safety report. If either document is missing, neither vendor will receive the payment, and rehearsals cannot proceed.

Additionally, if Vendor-A fails to hand over the stage by 10:00 AM and locks out Vendor-B's rigging crew, Vendor-A must pay Vendor-B a standby compensation penalty of $1,000 per hour directly, and the soundcheck will remain on hold until the handover is complete.
`;

async function run(): Promise<void> {
  const contractText = process.argv[2]
    ? await fs.readFile(process.argv[2], 'utf-8')
    : SAMPLE_CONTRACT_TEXT.trim();

  const client = new OpenAIContractFlowClientV2();
  const flows = await client.generateContractFlows(contractText);

  const bpmnService = new ContractToBpmnService();
  for (const flow of flows) {
    const ast = createContractFlowAST(flow);
    await bpmnService.generateXML(ast, { applyAutoLayout: true });
  }

  console.log('Finished generating BPMN files under resource/<DDMMYYYY>/');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
