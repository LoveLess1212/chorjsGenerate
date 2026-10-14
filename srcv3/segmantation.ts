import { z } from "zod";
import { callStructuredAI } from "./call_ai";
import { ATOMIC_SEGMENTATION_PROMPT,
        MACRO_DECOMPOSITION_PROMPT,
        //DEONTIC_CASCADE_PROMPT
 } from "./prompts";

export const DeonticOperatorEnum = z.enum([
  "obligation",
  "and",
  "contrary_to_duty",
  "last_chance",
  "permission",
  "forbidden",
  "trigger"
]);

export const AtomicInteractionSchema = z.object({
  step_id: z.string(),
  deontic_operator: DeonticOperatorEnum,
  initiator: z.string(),
  recipient: z.string(),
  action: z.string(),
  trigger_condition: z.string(),
  success_target_id: z.string().nullable(),
  fallback_target_id: z.string().nullable(),
  text_excerpt: z.string()
});

export const SubFlowSchema = z.object({
  flow_id: z.string(),
  service_name: z.string(),
  parties: z.array(z.string()),
  interactions: z.array(AtomicInteractionSchema)
});

export const ContractSegmentationSchema = z.object({
  contract_title: z.string(),
  global_parties: z.array(z.string()),
  flows: z.array(SubFlowSchema)
});

export type DeonticOperator = z.infer<typeof DeonticOperatorEnum>;
export type AtomicInteraction = z.infer<typeof AtomicInteractionSchema>;
export type SubFlow = z.infer<typeof SubFlowSchema>;
export type ContractSegmentation = z.infer<typeof ContractSegmentationSchema>;



export async function segmentContract(contractText: string): Promise<ContractSegmentation> {
  return callStructuredAI(
    ATOMIC_SEGMENTATION_PROMPT,
    contractText,
    ContractSegmentationSchema,
    "hierarchical_contract_segmentation"
  );
}
// this is deprecated and will be removed in a future update.. - duy