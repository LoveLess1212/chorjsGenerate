export interface PartyInput {
  name: string;
}

export type ExternalProcessEventName = 'Start' | 'Fulfill' | 'Breach';

type ProcessStepDefinitionBase = {
  id: string;
  name: string;
  annotation?: string;
};

export type StartEventDefinition = ProcessStepDefinitionBase & {
  kind: 'event';
  event: 'Start';
  nextStepIds: string[];
};

export type EndEventDefinition = ProcessStepDefinitionBase & {
  kind: 'event';
  event: 'Fulfill' | 'Breach';
};

/**
 * Definition for the fallback behavior of a task step
 * it either specifies a fallback step and a question to ask the user, or it specifies neither
 */
type TaskFallbackDefinition =
  | { fallbackStepId: string; fallbackQuestion: string }
  | { fallbackStepId?: never; fallbackQuestion?: never };

export type TaskStepDefinition = ProcessStepDefinitionBase & TaskFallbackDefinition & {
  kind: 'task';
  initiatorName: string;
  recipientName: string;
  nextStepIds?: string[];
};

export type ProcessStepDefinition = StartEventDefinition | EndEventDefinition | TaskStepDefinition;

/**
 * name: name of the contract in snake_case format, e.g., "service_agreement"
 * parties: array of parties involved in the contract, each with a name
 * steps: array of process step definitions, each with an id, kind, name, and optional annotation
 *   - for event steps: specify the event type 
 *      - for 'Start' event: specify nextStepIds, the name of the event represents the trigger condition for the contract flow
 *      - for 'Fulfill' or 'Breach' events: 
 *        - no nextStepIds
 *        - Fulfill represents the case where all the obligations are met, while Breach represents a of any task or event step that is not fulfilled, triggering the compensation flow
 *   - for task steps: specify the initiator and recipient names, optional nextStepIds, and optional fallbackStepId and fallbackQuestion
 * 
 */
export interface ContractFlowInput {
  parties: PartyInput[];
  steps: ProcessStepDefinition[];
  name: string;
}
