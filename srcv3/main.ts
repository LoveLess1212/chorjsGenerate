import * as fs from "fs";
import * as path from "path";
import { runContractPipeline } from "./pipeline";
import { buildScaffolding } from "./scaffolding";
import { createContractFlowAST, ContractToBpmnService } from "./json_xml";
import { infillScaffold } from "./infill";
const CONTRACTS: Record<string, string> = {
  jade_hotel: `
Jade Hotel will provide a room with a balcony and a view
of the sea. If the hotel cannot arrange a sea view room as
promised, it shall arrange an alternative room with a
luxurious interior design, or a king−size double bed. If this
compensation option is unavailable, Jade Hotel will offer
two adult members of the tourist family free access to the
hotel’s spa during their stay. If neither of these
compensations could be made, the tourist is entitled to a
50% discount on her accommodation at Jade Hotel upon
checkout.
`.trim(),

  whale_watching: `
During the summer, a tour company offers special sunset boat trips that depart from the easternmost point of the bay area. The trips are held on days with a high likelihood of spotting humpback whales. In case the humpback whales are not spotted during the initial boat trip organized by the tour company, a complimentary second tour will be offered within 3 days; if whales are still not sighted on this follow-up trip, CompanyX will compensate the guest with a full $100 travel voucher redeemable for future excursions, and failure by CompanyX to fulfill this remedy within 14 business days will result in a 50% cash reimbursement of the original ticket price paid to the guest. Soft drinks and snacks are provided on all these tours.
`.trim(),

  wedding_listing9: `
This is a penalty rule involving four participants: a couple getting married, Vendor A for furniture & tenting and Vendor-B for audio-visual & lighting equipment, and Vendor-C for catering & food. Prior to the wedding event, if Vendor A fails to install furniture & tenting as agreed upon previously, specifically if the delivery is delayed more than one hour but does not lead to a disrupt of the wedding event, Vendor-A must issue an immediate 25% rental fee credit to the couple within 7 business days. If the delay directly disrupts the event schedule by more than 30 minutes, the compensation escalates to a 50% refund of Vendor-A's total contract value. During the wedding event just before the last hours when the invited guests eat and socialize, if the supplied audio-visual apparatus turn defective or the lighting equipment fails, Vendor-B must provide a functional replacement within 90 minutes. Failure to remedy this on-site results in a 80% full refund of the rental cost plus a $300 operational failure fee payable to the couple. During the last hour of the wedding event, Vendor C must serve all scheduled courses and meals according to the agreed upon event timeline. If the food service fails to arrive or is rendered unconsumable, Vendor C must supply an alternative meal as per the previously specified back-up menu, failing which results in Vendor-C issuing a 100% full refund of the catering contract value plus cover liquidated damages up to $500 for alternative emergency food arrangements within 5 business days.
`.trim(),
custom_contract:``.trim()
};

async function runPipelineForContract(contractKey: string) {
  const contractText = CONTRACTS[contractKey];
  if (!contractText) {
    throw new Error(`Unknown contract key: ${contractKey}`);
  }

  console.log(`\n=============================================================`);
  console.log(`🚀 RUNNING PIPELINE FOR CONTRACT: ${contractKey.toUpperCase()}`);
  console.log(`=============================================================`);

  const result = await runContractPipeline(contractText);
  const resourceDir = path.resolve(__dirname, "resource");
  if (!fs.existsSync(resourceDir)) {
    fs.mkdirSync(resourceDir, { recursive: true });
  }

  const bpmnService = new ContractToBpmnService();

  for (let i = 0; i < result.flows.length; i++) {
    const flow = result.flows[i];
    console.log(`\n--- [FLOW ${i + 1}/${result.flows.length}] Generating BPMN: ${flow.service_name} ---`);
    const scaffold = buildScaffolding(flow, { mode: "standalone" });
    const infilledScaffold = await infillScaffold(flow,scaffold);
    const flowAST = createContractFlowAST(infilledScaffold);
    const xml = await bpmnService.generateXML(flowAST, { applyAutoLayout: true });

    const xmlFileName = `${contractKey}_flow_${i + 1}_${flow.flow_id}.bpmn`;
    const xmlPath = path.join(resourceDir, xmlFileName);
    fs.writeFileSync(xmlPath, xml, "utf-8");
    console.log(`BPMN XML successfully written to: ${xmlPath} (${xml.length} bytes)`);
  }
}

async function main() {
  const target = process.argv[2] || "jade_hotel";
  if (target === "all") {
    for (const key of Object.keys(CONTRACTS)) {
      await runPipelineForContract(key);
    }
  } else {
    await runPipelineForContract(target);
  }
}

runPipelineForContract("whale_watching");