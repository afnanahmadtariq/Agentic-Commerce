import OpenAI from 'openai';
import { env } from '../../config/index.js';
import { ShoppingSpec, ParseIntentInput } from '../../schemas/index.js';
import { ParsedIntent, ClarificationResponse } from '../../types/index.js';

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

const INTENT_PARSING_PROMPT = `You are an AI shopping assistant. Parse the user's shopping request and extract:
1. The shopping scenario (e.g., "skiing outfit", "party supplies", "home office setup")
2. Must-have items
3. Nice-to-have items
4. Constraints: budget, deadline, sizes, colors, brand preferences

Return a JSON object with this structure:
{
  "scenario": "string",
  "extractedConstraints": {
    "budget": number or null,
    "deadline": "ISO date string" or null,
    "sizes": { "category": "size" } or null,
    "colors": ["color1", "color2"] or null,
    "brands": ["brand1"] or null
  },
  "clarifyingQuestions": ["question1", "question2"],
  "confidence": 0.0 to 1.0,
  "rawItems": ["item1", "item2"]
}

If information is missing, add clarifying questions. Be helpful and thorough.`;

export class IntentParserService {
    async parseIntent(input: ParseIntentInput): Promise<ParsedIntent> {
        const completion = await openai.chat.completions.create({
            model: env.OPENAI_MODEL,
            messages: [
                { role: 'system', content: INTENT_PARSING_PROMPT },
                { role: 'user', content: input.message },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Failed to parse intent: No response from AI');
        }

        return JSON.parse(content) as ParsedIntent;
    }

    async processClarification(
        sessionId: string,
        currentSpec: Partial<ShoppingSpec>,
        userResponse: string
    ): Promise<ClarificationResponse> {
        const prompt = `Current shopping specification:
${JSON.stringify(currentSpec, null, 2)}

User's clarification response: "${userResponse}"

Update the specification based on this response and determine if more clarification is needed.
Return JSON:
{
  "updatedSpec": { ... updated fields ... },
  "isComplete": boolean,
  "nextQuestion": "string or null"
}`;

        const completion = await openai.chat.completions.create({
            model: env.OPENAI_MODEL,
            messages: [
                { role: 'system', content: 'You are a helpful shopping assistant. Parse clarification responses and update the shopping specification.' },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Failed to process clarification');
        }

        const result = JSON.parse(content);
        return {
            sessionId,
            updatedSpec: result.updatedSpec,
            isComplete: result.isComplete,
            nextQuestion: result.nextQuestion,
        };
    }
}

export const intentParserService = new IntentParserService();
