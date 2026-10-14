import 'dotenv/config';
import OpenAI from "openai";
import {zodResponseFormat} from 'openai/helpers/zod';
import {z} from "zod";


const apiKey = process.env.OPENAI_API_KEY;
if(!apiKey) {
    console.warn("No API Key");
}

export const openai = new OpenAI({apiKey});

export async function callStructuredAI<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>,
    schemaName: string = 'result_schema',
    model: string = process.env.OPENAI_MODEL || 'gpt-4o-mini'
): Promise<T>{
    const completion = await openai.chat.completions.parse({
    model,
    temperature:0,
    messages:[
        {role:'system', content:systemPrompt},
        {role:'user', content: userPrompt}
    ],
    response_format: zodResponseFormat(schema, schemaName),
    });
    const parsed = completion.choices[0]?.message?.parsed;
    if(!parsed) {
        throw new Error(`Schema syntax mismatch ${schemaName}`);
    }
    return parsed;
}

