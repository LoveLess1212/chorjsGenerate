import { z } from 'zod';

export const RuleSegmentationResponseSchema = z.object({
  rules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    text: z.string()
  }))
});

export type SegmentedRule = z.infer<typeof RuleSegmentationResponseSchema>['rules'][number];