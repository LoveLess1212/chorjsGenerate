import { z } from "zod";
import { CompiledSubFlow, FinalAtomicInteraction, InfillDictionary } from "./schemas";

export interface PartyInput {
  name: string;
}

export interface ProcessStepDefinitionBase {
  id: string;
  name: string;
  annotation?: string;
}

export interface StartEventDefinition extends ProcessStepDefinitionBase {
  kind: "event";
  event: "Start";
  nextStepIds: string[];
}

export interface EndEventDefinition extends ProcessStepDefinitionBase {
  kind: "event";
  event: "Fulfill" | "Breach";
}

export interface TaskStepDefinition extends ProcessStepDefinitionBase {
  kind: "task";
  initiatorName: string;
  recipientName: string;
  nextStepIds?: string[];
  fallbackStepId?: string;
  fallbackQuestion?: string;
}

export type ProcessStepDefinition =
  | StartEventDefinition
  | EndEventDefinition
  | TaskStepDefinition;

export interface ContractFlowInput {
  name: string;
  parties: PartyInput[];
  steps: ProcessStepDefinition[];
}

export interface ScaffoldingOptions {
  mode?: "standalone" | "composite";
}

export function buildScaffolding(
  flow: CompiledSubFlow,
  options: ScaffoldingOptions = { mode: "standalone" }
): ContractFlowInput {
  const steps: ProcessStepDefinition[] = [];
  const interactions = flow.interactions;

  if (interactions.length === 0) {
    throw new Error(`Flow ${flow.flow_id} has no interactions to scaffold`);
  }

  const localStepIds = new Set(interactions.map((item) => item.step_id));

  const partySet = new Set<string>();
  flow.parties.forEach((p) => partySet.add(p.trim()));
  interactions.forEach((item) => {
    partySet.add(item.initiator.trim());
    partySet.add(item.recipient.trim());
  });
  const parties: PartyInput[] = Array.from(partySet).map((name) => ({ name }));

  const remedyTargetIds = new Set<string>();
  interactions.forEach((item) => {
    if (item.fallback_target_id && item.fallback_target_id !== "terminal_breach") {
      remedyTargetIds.add(item.fallback_target_id);
    }
  });

  const happyPathSteps = interactions.filter(
    (item) => !remedyTargetIds.has(item.step_id)
  );

  const startEventId = `event-start-${flow.flow_id}`;
  const fulfillEventId = `event-fulfill-${flow.flow_id}`;
  const breachEventId = `event-breach-${flow.flow_id}`;

  if (options.mode === "standalone") {
    const firstStepId = interactions[0].step_id;
    const initialCondition = interactions[0].trigger_condition || "Contract enactment";

    steps.push({
      id: startEventId,
      kind: "event",
      event: "Start",
      name: `Start: ${initialCondition}`,
      annotation: `Trigger condition initiating ${flow.service_name}`,
      nextStepIds: [firstStepId],
    });
  }

  interactions.forEach((item) => {
    const isRemedy = remedyTargetIds.has(item.step_id);

    let fallbackStepId: string;
    if (
      !item.fallback_target_id ||
      item.fallback_target_id === "terminal_breach" ||
      !localStepIds.has(item.fallback_target_id)
    ) {
      fallbackStepId = breachEventId;
    } else {
      fallbackStepId = item.fallback_target_id;
    }

    let nextStepIds: string[];
    if (item.success_target_id && localStepIds.has(item.success_target_id)) {
      nextStepIds = [item.success_target_id];
    } else if (!isRemedy) {
      const currentHappyIdx = happyPathSteps.findIndex(
        (h) => h.step_id === item.step_id
      );
      if (currentHappyIdx !== -1 && currentHappyIdx < happyPathSteps.length - 1) {
        nextStepIds = [happyPathSteps[currentHappyIdx + 1].step_id];
      } else {
        nextStepIds = [fulfillEventId];
      }
    } else {
      nextStepIds = [fulfillEventId];
    }

    const fallbackItem = item.fallback_target_id
      ? interactions.find((i) => i.step_id === item.fallback_target_id)
      : null;
    const positiveQuestion = generateDefaultPositiveQuestion(item, fallbackItem);

    const taskNode: TaskStepDefinition = {
      id: item.step_id,
      kind: "task",
      name: item.action,
      initiatorName: item.initiator,
      recipientName: item.recipient,
      annotation: `Condition: ${item.trigger_condition}`,
      fallbackQuestion: positiveQuestion,
      fallbackStepId: fallbackStepId,
      nextStepIds: nextStepIds,
    };

    steps.push(taskNode);
  });

  if (options.mode === "standalone") {
    steps.push({
      id: fulfillEventId,
      kind: "event",
      event: "Fulfill",
      name: `${flow.service_name} Fulfilled`,
    });

    steps.push({
      id: breachEventId,
      kind: "event",
      event: "Breach",
      name: `${flow.service_name} Breached`,
    });
  }

  const sanitizedName = flow.flow_id.replace(/-/g, "_");

  return {
    name: sanitizedName,
    parties,
    steps,
  };
}

export function generateDefaultPositiveQuestion(
  item: FinalAtomicInteraction
): string {
  return `Was ${item.action.toLowerCase()} fulfilled?`;
}

export function applyInfilledSlots(
  scaffold: ContractFlowInput,
  infilledData: InfillDictionary
): ContractFlowInput {
  const finalAst: ContractFlowInput = JSON.parse(JSON.stringify(scaffold));

  finalAst.steps.forEach((step) => {
    if (step.kind === "task") {
      const fillSlot = infilledData[step.id];
      if (fillSlot) {
        step.name = fillSlot.name.trim();
        step.annotation = fillSlot.annotation.trim();
        step.fallbackQuestion = fillSlot.fallbackQuestion.trim();
      }
    }
  });
  return finalAst;
}
