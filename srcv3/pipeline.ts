import { callStructuredAI } from "./call_ai";
import {
  STAGE_1_DECOMPOSITION_PROMPT,
  STAGE_2_DEONTIC_MAPPING_PROMPT
} from "./prompts";
import {
  Stage1DecompositionSchema,
  Stage1Decomposition,
  Stage2MappingResultSchema,
  Stage2MappingResult,
  CompiledSubFlow
} from "./schemas";
import { compileSubFlow } from "./compiler";

export interface PipelineResult {
  contract_title: string;
  global_parties: string[];
  flows: CompiledSubFlow[];
  stage1Raw: Stage1Decomposition;
}

/**
 * Execute The Gold-Standard 3-Stage Pipeline:
 * Stage 1: LLM Contract Decomposition & Implicit Duty Unpacking
 * Stage 2: LLM Atomic Deontic & Flow Transition Mapping
 * Stage 3: Pure TypeScript Graph Compiler (Wiring pointers & invariants)
 */
export async function runContractPipeline(contractText: string): Promise<PipelineResult> {
  console.log("=== [STAGE 1: DECOMPOSITION & UNPACKING] ===");
  const stage1Result = await callStructuredAI(
    STAGE_1_DECOMPOSITION_PROMPT,
    contractText,
    Stage1DecompositionSchema,
    "stage1_contract_decomposition"
  );

  console.log(`Contract Title: "${stage1Result.contract_title}"`);
  console.log(`Global Parties: [${stage1Result.global_parties.join(", ")}]`);
  console.log(`Identified Flows: ${stage1Result.flows.length}`);
  stage1Result.flows.forEach((f, idx) => {
    console.log(`  Flow ${idx + 1}: ${f.service_name} (${f.flow_id}) - ${f.clauses.length} unpacked clauses`);
  });

  console.log("\n=== [STAGE 2: ATOMIC DEONTIC MAPPING] ===");
  // Execute Stage 2 concurrently for all identified flows
  const flowResults = await Promise.all(
    stage1Result.flows.map(async (flow, flowIdx) => {
      const userPrompt = `
TARGET FLOW TO MAP:
- Flow ID: ${flow.flow_id}
- Service Name: ${flow.service_name}
- Parties: ${flow.parties.join(", ")}

ORDERED UNPACKED CLAUSES TO MAP:
${JSON.stringify(flow.clauses, null, 2)}

ORIGINAL CONTRACT TEXT FOR REFERENCE:
${contractText}
      `.trim();

      const stage2Result: Stage2MappingResult = await callStructuredAI(
        STAGE_2_DEONTIC_MAPPING_PROMPT,
        userPrompt,
        Stage2MappingResultSchema,
        `stage2_mapping_${flow.flow_id}`
      );

      console.log(`Mapped Flow ${flowIdx + 1} (${flow.flow_id}): ${stage2Result.interactions.length} interactions`);

      // Stage 3: TypeScript Graph Compiler
      const compiledFlow = compileSubFlow(flowIdx, flow, stage2Result.interactions);
      return compiledFlow;
    })
  );

  console.log("\n=== [STAGE 3: GRAPH COMPILATION COMPLETE] ===");
  flowResults.forEach((f) => {
    console.log(`Flow: ${f.service_name} (${f.flow_id})`);
    f.interactions.forEach((step) => {
      console.log(`  - [${step.deontic_operator.toUpperCase()}] ${step.step_id} ("${step.action}")`);
      console.log(`    Success -> ${step.success_target_id ?? "null"}, Fallback -> ${step.fallback_target_id ?? "null"}`);
    });
  });

  return {
    contract_title: stage1Result.contract_title,
    global_parties: stage1Result.global_parties,
    flows: flowResults,
    stage1Raw: stage1Result
  };
}
