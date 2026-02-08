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
        // Check if we should use fallback mode (no OpenAI key or explicitly disabled)
        const useOpenAI = env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'disabled';

        if (!useOpenAI) {
            console.log('🔄 Using fallback intent parser (OpenAI disabled)');
            return this.fallbackParseIntent(input.message);
        }

        try {
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
        } catch (error: any) {
            // If rate limit or quota exceeded, use fallback
            if (error?.status === 429 || error?.code === 'insufficient_quota') {
                console.warn('⚠️ OpenAI quota exceeded, using fallback parser');
                return this.fallbackParseIntent(input.message);
            }
            throw error;
        }
    }

    /**
     * Simple fallback parser that extracts basic intent without AI
     * Used when OpenAI is unavailable or quota is exceeded
     */
    private fallbackParseIntent(message: string): ParsedIntent {
        const lowerMessage = message.toLowerCase();

        // Extract potential items (words that might be products)
        const words = message.split(/\s+/).filter(w => w.length > 2);
        const rawItems = words.filter(w =>
            !['need', 'want', 'buy', 'get', 'for', 'the', 'and', 'with', 'under', 'about'].includes(w.toLowerCase())
        );

        // Try to extract budget
        const budgetMatch = message.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        const budget = budgetMatch ? parseFloat(budgetMatch[1].replace(',', '')) : undefined;

        // Try to extract deadline
        let deadline: string | undefined;
        if (lowerMessage.includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            deadline = tomorrow.toISOString();
        } else if (lowerMessage.includes('next week')) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            deadline = nextWeek.toISOString();
        }

        // Determine scenario from keywords
        let scenario = 'general shopping';
        const scenarioKeywords: Record<string, string[]> = {
            'skiing outfit': ['ski', 'skiing', 'snow', 'winter'],
            'outdoor gear': ['hiking', 'camping', 'outdoor', 'trek'],
            'home office': ['desk', 'office', 'computer', 'monitor'],
            'party supplies': ['party', 'birthday', 'celebration'],
            'fashion shopping': ['clothes', 'dress', 'shirt', 'pants', 'shoes'],
            'electronics': ['phone', 'laptop', 'tablet', 'headphones', 'camera'],
        };

        for (const [scenarioName, keywords] of Object.entries(scenarioKeywords)) {
            if (keywords.some(k => lowerMessage.includes(k))) {
                scenario = scenarioName;
                break;
            }
        }

        return {
            scenario,
            extractedConstraints: {
                budget,
                deadline,
            },
            clarifyingQuestions: [],
            confidence: 0.6, // Lower confidence for fallback parsing
            rawItems,
        };
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
