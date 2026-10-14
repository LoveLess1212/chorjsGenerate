import { segmentContract } from "./segmantation";

async function main() {
  const listing9Contract = `
Titan Truss & Structures Ltd. (Vendor-A) must build the main outdoor stage framework and provide a structural load-bearing certificate to Apex Live Events LLC (Producer) by 10:00 AM on Friday. At the same time, SoundWave Pro Audio Inc. (Vendor-B) must rig the aerial line-array sound system and submit an electrical safety grounding report to the Producer by 12:00 PM on Friday.
The Producer will release the $50,000 Milestone-2 escrow payment—split equally between both vendors—and permit the headliner artist's technical soundcheck only after both Vendor-A submits the structural certificate and Vendor-B submits the electrical safety report. If either document is missing, neither vendor will receive the payment, and rehearsals cannot proceed.
Additionally, if Vendor-A fails to hand over the stage by 10:00 AM and locks out Vendor-B's rigging crew, Vendor-A must pay Vendor-B a standby compensation penalty of $1,000 per hour directly, and the soundcheck will remain on hold until the handover is complete.
  `;

  console.log("Segmenting Listing 9 into Hierarchical Sub-Flows...");
  const result = await segmentContract(listing9Contract);

  console.log("=== CONTRACT TITLE ===");
  console.log(result.contract_title);

  console.log("\n=== GLOBAL PARTIES ===");
  console.log(result.global_parties);

  console.log(`\n=== SUB-FLOWS COUNT: ${result.flows.length} ===`);
  result.flows.forEach((flow, fIndex) => {
    console.log(`\n-----------------------------------------------------------`);
    console.log(`[FLOW ${fIndex + 1}] ID: ${flow.flow_id}`);
    console.log(`       Service: ${flow.service_name}`);
    console.log(`       Parties: [${flow.parties.join(", ")}]`);
    console.log(`       Steps (${flow.interactions.length}):`);

    flow.interactions.forEach((item, index) => {
      console.log(`\n  (${fIndex + 1}.${index + 1}) ID: ${item.step_id}`);
      console.log(`      Operator:  ${item.deontic_operator.toUpperCase()}`);
      console.log(`      Topology:  ${item.initiator} -> ${item.recipient}`);
      console.log(`      Action:    ${item.action}`);
      console.log(`      Condition: ${item.trigger_condition}`);
      console.log(`      Fallback:  ${item.fallback_target_id ?? "none"}`);
      console.log(`      Excerpt:   "${item.text_excerpt.trim()}"`);
    });
  });
}

main().catch(console.error);
