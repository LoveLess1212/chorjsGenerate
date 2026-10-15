import { z } from "zod";


export const ClauseRoleEnum = z.enum([
  "PRIMARY_DUTY",
  "REMEDY_OR_PENALTY",
  "OPTIONAL_RIGHT",
  "PROHIBITION"
]);
export type ClauseRole = z.infer<typeof ClauseRoleEnum>;

export const NormativeClauseSchema = z.object({
  role: ClauseRoleEnum.describe(
    "Functional role: PRIMARY_DUTY (positive happy-path performance), REMEDY_OR_PENALTY (cure, credit, refund), OPTIONAL_RIGHT (permission), PROHIBITION (forbidden)"
  ),
  clause_summary: z.string().describe(
    "Clear, positive operational statement of what the acting party must do or not do"
  ),
  text_excerpt: z.string().describe(
    "Verbatim excerpt from the contract supporting this clause"
  )
});
export type NormativeClause = z.infer<typeof NormativeClauseSchema>;

export const Stage1FlowSchema = z.object({
  flow_id: z.string().describe(
    "Unique kebab-case identifier for this service branch, e.g. flow-hotel-accommodation, flow-vendor-a-furniture"
  ),
  service_name: z.string().describe(
    "Descriptive name of the service branch, e.g. Jade Hotel Accommodation Service"
  ),
  parties: z.array(z.string()).describe(
    "Subset of parties participating in this flow, e.g. ['Tourist', 'Jade Hotel']"
  ),
  clauses: z.array(NormativeClauseSchema).describe(
    "Ordered list of unpacked clauses for this flow. The first clause MUST have role PRIMARY_DUTY."
  )
});
export type Stage1Flow = z.infer<typeof Stage1FlowSchema>;

export const Stage1DecompositionSchema = z.object({
  contract_title: z.string().describe(
    "Concise descriptive title of the agreement"
  ),
  global_parties: z.array(z.string()).describe(
    "All unique participating parties across the entire contract"
  ),
  flows: z.array(Stage1FlowSchema).describe(
    "List of independent service branches. Single-service or sequential contracts return exactly 1 flow."
  )
});
export type Stage1Decomposition = z.infer<typeof Stage1DecompositionSchema>;



export const DeonticOperatorEnum = z.enum([
  "obligation",
  "contrary_to_duty",
  "last_chance",
  "permission",
  "forbidden"
]);
export type DeonticOperator = z.infer<typeof DeonticOperatorEnum>;

export const FlowTransitionEnum = z.enum([
  "FALLBACK_TO_NEXT_STEP",
  "ADVANCE_TO_NEXT_DUTY",
  "CURE_AND_RESUME_DUTY",
  "OPTIONAL_NO_FALLBACK",
  "TERMINAL_ON_FAILURE"
]);
export type FlowTransition = z.infer<typeof FlowTransitionEnum>;

export const Stage2InteractionSchema = z.object({
  deontic_operator: DeonticOperatorEnum.describe(
    "Operational deontic operator classification"
  ),
  initiator: z.string().describe(
    "Party performing, permitted, or forbidden to do the action (must be in flow parties)"
  ),
  recipient: z.string().describe(
    "Counterparty receiving performance or remedy (must be in flow parties)"
  ),
  action: z.string().describe(
    "Concise verb phrase (2-5 words), e.g. 'Provide sea view room', 'Offer spa access'"
  ),
  trigger_condition: z.string().describe(
    "For obligation: timeframe/premise. For remedy/last_chance: breach/defect premise that activated it."
  ),
  flow_transition: FlowTransitionEnum.describe(
    "How this step transitions in the flow"
  ),
  text_excerpt: z.string().describe(
    "Verbatim excerpt supporting this step"
  )
});
export type Stage2Interaction = z.infer<typeof Stage2InteractionSchema>;

export const Stage2MappingResultSchema = z.object({
  flow_id: z.string(),
  interactions: z.array(Stage2InteractionSchema).describe(
    "Ordered interactions for this flow matching the unpacked clauses"
  )
});
export type Stage2MappingResult = z.infer<typeof Stage2MappingResultSchema>;




export const FinalAtomicInteractionSchema = z.object({
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
export type FinalAtomicInteraction = z.infer<typeof FinalAtomicInteractionSchema>;

export const CompiledSubFlowSchema = z.object({
  flow_id: z.string(),
  service_name: z.string(),
  parties: z.array(z.string()),
  interactions: z.array(FinalAtomicInteractionSchema)
});
export type CompiledSubFlow = z.infer<typeof CompiledSubFlowSchema>;


export const InfillSlotItemSchema = z.object({
  step_id: z.string().describe("Exact matching step_id of the task"),
  name: z.string().describe("Concise active verb phrase (2-5 words)"),
  annotation: z.string().describe("Brief timeframe, deadline, or trigger condition (or empty string)"),
  fallbackQuestion: z.string().describe("Concise, natural language YES/NO question to ask if the task was fulfilled (under 10 words, without quotation marks)")
});
export type InfillSlotItem = z.infer<typeof InfillSlotItemSchema>;
export const InfillResponseSchema = z.object({
  items: z.array(InfillSlotItemSchema)
});
export type InfillResponse = z.infer<typeof InfillResponseSchema>;
export const InfillSlotSchema = z.object({
  name: z.string(),
  annotation: z.string(),
  fallbackQuestion: z.string()
});
export type InfillSlot = z.infer<typeof InfillSlotSchema>;
export const InfillDictionarySchema = z.record(z.string(), InfillSlotSchema);
export type InfillDictionary = z.infer<typeof InfillDictionarySchema>;
