import { ContractFlowInput } from './services/ai/external-interface';
import { ContractFlowAST, ProcessStep } from './internal-interface';

export * from './services/ai/external-interface';
export * from './internal-interface';

export function createContractFlowAST(input: ContractFlowInput): ContractFlowAST {
  const stepById = new Map<string, ProcessStep>();

  input.steps.forEach(stepDefinition => {
    if (stepById.has(stepDefinition.id)) {
      throw new Error(`Duplicate process step id: ${stepDefinition.id}`);
    }

    const step = stepDefinition.kind === 'task'
      ? new ProcessStep({
        id: stepDefinition.id,
        kind: 'task',
        name: stepDefinition.name,
        annotation: stepDefinition.annotation,
        initiatorName: stepDefinition.initiatorName,
        recipientName: stepDefinition.recipientName
      })
      : new ProcessStep({
        id: stepDefinition.id,
        kind: 'event',
        event: stepDefinition.event,
        name: stepDefinition.name,
        annotation: stepDefinition.annotation
      });

    stepById.set(stepDefinition.id, step);
  });

  input.steps.forEach(stepDefinition => {
    const step = resolveStep(stepById, stepDefinition.id);
    const nextStepIds = stepDefinition.kind === 'event' && stepDefinition.event !== 'Start'
      ? []
      : stepDefinition.nextStepIds ?? [];

    step.nextSteps = nextStepIds.map(nextStepId => resolveStep(stepById, nextStepId));

    if (stepDefinition.kind === 'task' && stepDefinition.fallbackStepId) {
      step.fallbackStep = resolveStep(stepById, stepDefinition.fallbackStepId);
      step.fallbackQuestion = stepDefinition.fallbackQuestion;
    }
  });

  return {
    name: input.name,
    parties: input.parties,
    steps: input.steps.map(stepDefinition => resolveStep(stepById, stepDefinition.id))
  };
}

function resolveStep(stepById: Map<string, ProcessStep>, id: string): ProcessStep {
  const step = stepById.get(id);

  if (!step) {
    throw new Error(`Unknown process step id: ${id}`);
  }

  return step;
}
