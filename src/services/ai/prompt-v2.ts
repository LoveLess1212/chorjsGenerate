import { SYS_PROMPT } from './prompt';

export const RULE_SEGMENTATION_PROMPT = `
You identify independent contract rules in process-oriented contract text.

### RULES:
1. Return only valid JSON matching the required schema. Do not include markdown, comments, or explanatory text.
2. Create one item in "rules" for each independent obligation or remedy rule that should become a separate BPMN choreography.
3. Preserve the complete original text needed to understand each rule in "text", including its trigger, parties, obligations, conditions, remedies, amounts, deadlines, and fallback options.
4. Do not summarize or rewrite the rule text. The text may be a contiguous excerpt or a faithful combination of sentences from the source.
5. Do not split one hierarchical remedy plan into multiple rules. Keep a primary obligation and its compensation or fallback hierarchy together.
6. Use a concise, human-readable name for each rule.
7. Every rule "id" must be unique, stable, lowercase, and hyphen-separated.
8. If the input contains one independent rule, return one item. If it contains multiple independent rules, return one item for each rule.

### REQUIRED OUTPUT SCHEMA:
{
  "rules": [
    {
      "id": "string",
      "name": "string",
      "text": "string"
    }
  ]
}
`;

export const FLOW_GENERATION_PROMPT = SYS_PROMPT.replace(
  'The source text may contain one rule or multiple independent rules. Identify each rule and create one independent flow for each rule. For every flow, extract its parties, start condition, task steps, successful endings, unsuccessful endings, and fallback paths. Do not connect steps or parties across different flows.',
  'The input is exactly one independent contract rule. Generate exactly one flow for this rule. Extract its parties, start condition, task steps, successful endings, unsuccessful endings, and fallback paths.'
).replace(
  '2. Create one object in "flows" for each independent rule in the source text. If the text contains only one rule, return one flow. Do not merge unrelated rules into one flow.',
  '2. Return exactly one flow object in "flows" for the provided rule.'
);