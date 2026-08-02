import 'dotenv/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ContractFlowInput } from './external-interface';
import { SYS_PROMPT } from './prompt';
import { ContractFlowInputSchema, normalizeContractFlowInput } from './contract-flow-schema';
import { LoggingService } from '../logging-service';

export interface GenerateContractFlowOptions {
  model?: string;
}

const DEFAULT_MODEL = 'gpt-4.1-mini';

export class OpenAIContractFlowClient {
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

  async generateContractFlow(
    contractText: string,
    options: GenerateContractFlowOptions = {}
  ): Promise<ContractFlowInput> {
    const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    const startedAt = Date.now();

    await this.logger.log('openai.contract_flow.request', {
      provider: 'openai',
      model,
      inputCharacters: contractText.length,
      systemPromptCharacters: SYS_PROMPT.length,
      contractText,
      systemPrompt: SYS_PROMPT
    });

    try {
      const completion = await this.client.chat.completions.parse({
        model,
        response_format: zodResponseFormat(ContractFlowInputSchema, 'contract_flow_input'),
        messages: [
          { role: 'system', content: SYS_PROMPT },
          { role: 'user', content: contractText }
        ]
      });
      const message = completion.choices[0]?.message;
      const responseText = message?.content;
      const parsed = message?.parsed;

      if (!parsed) {
        throw new Error('OpenAI returned a response that could not be parsed as ContractFlowInput.');
      }

      await this.logger.log('openai.contract_flow.response', {
        provider: 'openai',
        model,
        durationMs: Date.now() - startedAt,
        openAIResponseId: completion.id,
        finishReason: completion.choices[0]?.finish_reason,
        usage: completion.usage,
        responseText,
        parsed,
        normalized: normalizeContractFlowInput(parsed)
      });

      return normalizeContractFlowInput(parsed);
    } catch (error) {
      await this.logger.log('openai.contract_flow.error', {
        provider: 'openai',
        model,
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }
}
