import 'dotenv/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ContractFlowInput } from './external-interface';
import {
  ContractFlowResponseSchema,
  normalizeContractFlowInput
} from './contract-flow-schema';
import {
  RuleSegmentationResponseSchema,
  SegmentedRule
} from './rule-segmentation-schema';
import { FLOW_GENERATION_PROMPT, RULE_SEGMENTATION_PROMPT } from './prompt-v2';
import { LoggingService } from '../logging-service';

export interface GenerateContractFlowV2Options {
  model?: string;
}

const DEFAULT_MODEL = 'gpt-4.1-mini';

export class OpenAIContractFlowClientV2 {
  private readonly client: OpenAI;

  constructor(
    private readonly logger = new LoggingService(),
    apiKey = process.env.OPENAI_API_KEY
  ) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required in a .env file or environment variable to call OpenAI.');
    }

    this.client = new OpenAI({ apiKey });
  }

  async generateContractFlows(
    contractText: string,
    options: GenerateContractFlowV2Options = {}
  ): Promise<ContractFlowInput[]> {
    const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    const rules = await this.segmentRules(contractText, model);
    const flows = await Promise.all(rules.map(rule => this.generateFlow(rule, model)));

    return flows;
  }

  private async segmentRules(contractText: string, model: string): Promise<SegmentedRule[]> {
    const completion = await this.client.chat.completions.parse({
      model,
      response_format: zodResponseFormat(RuleSegmentationResponseSchema, 'rule_segmentation_response'),
      messages: [
        { role: 'system', content: RULE_SEGMENTATION_PROMPT },
        { role: 'user', content: contractText }
      ]
    });
    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error('OpenAI returned a response that could not be parsed as segmented rules.');
    }

    await this.logger.log('openai.contract_flow_v2.segmented', {
      provider: 'openai',
      model,
      inputCharacters: contractText.length,
      ruleCount: parsed.rules.length,
      parsed
    });

    return parsed.rules;
  }

  private async generateFlow(rule: SegmentedRule, model: string): Promise<ContractFlowInput> {
    const completion = await this.client.chat.completions.parse({
      model,
      response_format: zodResponseFormat(ContractFlowResponseSchema, 'contract_flow_response'),
      messages: [
        { role: 'system', content: FLOW_GENERATION_PROMPT },
        { role: 'user', content: rule.text }
      ]
    });
    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error(`OpenAI returned no flow for segmented rule: ${rule.id}`);
    }

    if (parsed.flows.length !== 1) {
      throw new Error(`OpenAI returned ${parsed.flows.length} flows for segmented rule: ${rule.id}`);
    }

    const flowInput = parsed.flows[0];
    const flow = normalizeContractFlowInput(flowInput);

    await this.logger.log('openai.contract_flow_v2.generated', {
      provider: 'openai',
      model,
      ruleId: rule.id,
      ruleName: rule.name,
      parsed,
      normalized: flow
    });

    return flow;
  }
}