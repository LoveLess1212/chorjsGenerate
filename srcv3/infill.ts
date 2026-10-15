import { callStructuredAI } from "./call_ai";
import { INFILL_SYSTEM_PROMPT } from "./prompts";
import {
  CompiledSubFlow,
  InfillResponseSchema,
  InfillResponse,
  InfillDictionary
} from "./schemas";
import {
  ContractFlowInput,
  applyInfilledSlots
} from "./scaffolding";

export async function infillScaffold(
  flow: CompiledSubFlow,
  scaffold: ContractFlowInput
): Promise<ContractFlowInput> {
  const interactionMap = new Map(flow.interactions.map((item) => [item.step_id, item]));

  const taskSlots = scaffold.steps
    .filter((s) => s.kind === "task")
    .map((s) => {
      const task = s as any;
      const origin = interactionMap.get(task.id);
      return {
        step_id: task.id,
        operator: origin?.deontic_operator,
        action: origin?.action,
        condition: origin?.trigger_condition,
        text_excerpt: origin?.text_excerpt
      };
    });

  const userPayload = JSON.stringify(
    {
      service_name: flow.service_name,
      tasks_to_refine: taskSlots
    },
    null,
    2
  );

  const infilledResp: InfillResponse = await callStructuredAI(
    INFILL_SYSTEM_PROMPT,
    userPayload,
    InfillResponseSchema,
    "ast_slot_infilling"
  );

  const infilledDict: InfillDictionary = {};
  for (const item of infilledResp.items) {
    infilledDict[item.step_id] = {
      name: item.name,
      annotation: item.annotation,
      fallbackQuestion: item.fallbackQuestion
    };
  }

  return applyInfilledSlots(scaffold, infilledDict);
}
