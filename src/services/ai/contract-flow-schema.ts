import { z } from 'zod';
import { ContractFlowInput, ProcessStepDefinition } from './external-interface';

const PartySchema = z.object({
  name: z.string()
});

const StepBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  annotation: z.string().nullable()
});

const StartEventDefinitionSchema = StepBaseSchema.extend({
  kind: z.literal('event'),
  event: z.literal('Start'),
  nextStepIds: z.array(z.string())
});

const EndEventDefinitionSchema = StepBaseSchema.extend({
  kind: z.literal('event'),
  event: z.union([z.literal('Fulfill'), z.literal('Breach')])
});

const TaskStepDefinitionSchema = StepBaseSchema.extend({
  kind: z.literal('task'),
  initiatorName: z.string(),
  recipientName: z.string(),
  nextStepIds: z.array(z.string()).nullable(),
  fallbackStepId: z.string().nullable(),
  fallbackQuestion: z.string().nullable()
});

export const ContractFlowInputSchema = z.object({
  parties: z.array(PartySchema),
  steps: z.array(z.union([
    StartEventDefinitionSchema,
    EndEventDefinitionSchema,
    TaskStepDefinitionSchema
  ])),
  name: z.string()
});

export type ContractFlowInputFromSchema = z.infer<typeof ContractFlowInputSchema>;

export function normalizeContractFlowInput(input: ContractFlowInputFromSchema): ContractFlowInput {
  const stepNameById = new Map(input.steps.map(step => [step.id, step.name]));

  return {
    name: input.name,
    parties: input.parties,
    steps: input.steps.map(step => normalizeStep(step, stepNameById))
  };
}

function normalizeStep(
  step: ContractFlowInputFromSchema['steps'][number],
  stepNameById: Map<string, string>
): ProcessStepDefinition {
  const base = {
    id: step.id,
    name: step.name,
    ...(step.annotation === null ? {} : { annotation: step.annotation })
  };

  if (step.kind === 'event') {
    return step.event === 'Start'
      ? {
        ...base,
        kind: 'event',
        event: 'Start',
        nextStepIds: step.nextStepIds
      }
      : {
        ...base,
        kind: 'event',
        event: step.event
      };
  }

  const taskBase = {
    ...base,
    kind: 'task' as const,
    initiatorName: step.initiatorName,
    recipientName: step.recipientName,
    ...(step.nextStepIds === null ? {} : { nextStepIds: step.nextStepIds })
  };

  if (step.fallbackStepId !== null) {
    return {
      ...taskBase,
      fallbackStepId: step.fallbackStepId,
      fallbackQuestion: step.fallbackQuestion ?? createFallbackQuestion(step.fallbackStepId, stepNameById)
    };
  }

  return taskBase;
}

function createFallbackQuestion(fallbackStepId: string, stepNameById: Map<string, string>): string {
  const fallbackStepName = stepNameById.get(fallbackStepId);

  if (!fallbackStepName) {
    return 'Is the required option available?';
  }

  const subject = fallbackStepName
    .trim()
    .toLowerCase()
    .replace(/^(provide|offer|arrange|deliver|grant|give|pay|waive|apply|issue)\s+/, '');

  if (!subject || subject.includes('breach') || subject.includes('uncompensated') || subject.startsWith('no ')) {
    return 'Is compensation available?';
  }

  return `Is ${subject} available?`;
}
