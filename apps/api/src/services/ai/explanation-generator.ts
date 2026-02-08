import OpenAI from 'openai';
import { env } from '../../config/index.js';
import { RankingExplanation } from '../../types/index.js';

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

const EXPLANATION_PROMPT = `You are explaining why a shopping cart was ranked #1 among alternatives.

Given the cart details and ranking factors, generate a clear, friendly explanation that:
1. Highlights the main reasons this cart is recommended
2. Mentions specific products and their benefits
3. Addresses how it meets the user's constraints (budget, delivery, preferences)
4. Is conversational but informative

Keep it under 200 words.`;

export class ExplanationGeneratorService {
    async generateExplanation(
        cartDetails: {
            items: Array<{ name: string; price: number; retailer: string }>;
            totalCost: number;
            deliveryDate: Date;
            score: number;
        },
        userConstraints: {
            budget?: number;
            deadline?: string;
            preferences?: string[];
        },
        rankingFactors: Array<{
            name: string;
            weight: number;
            score: number;
        }>
    ): Promise<RankingExplanation> {
        const prompt = `Cart Details:
${JSON.stringify(cartDetails, null, 2)}

User Constraints:
${JSON.stringify(userConstraints, null, 2)}

Ranking Factors:
${JSON.stringify(rankingFactors, null, 2)}

Generate an explanation for why this cart is the top recommendation.
Return JSON:
{
  "overallReason": "2-3 sentence summary",
  "factors": [
    {
      "name": "factor name",
      "weight": 0.0-1.0,
      "score": 0.0-1.0,
      "description": "why this factor scored well"
    }
  ],
  "alternatives": ["suggestion 1", "suggestion 2"]
}`;

        const completion = await openai.chat.completions.create({
            model: env.OPENAI_MODEL,
            messages: [
                { role: 'system', content: EXPLANATION_PROMPT },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Failed to generate explanation');
        }

        const result = JSON.parse(content);
        return {
            cartId: '', // Will be set by caller
            overallReason: result.overallReason,
            factors: result.factors,
            alternatives: result.alternatives || [],
        };
    }

    async generateQuickExplanation(
        score: number,
        totalCost: number,
        budget: number | undefined,
        deliveryDays: number,
        deadline: string | undefined
    ): string {
        const reasons: string[] = [];

        if (budget && totalCost <= budget) {
            const savings = budget - totalCost;
            reasons.push(`$${savings.toFixed(2)} under budget`);
        }

        if (deadline) {
            const deadlineDate = new Date(deadline);
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

            if (deliveryDate <= deadlineDate) {
                const daysEarly = Math.ceil((deadlineDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysEarly > 0) {
                    reasons.push(`arrives ${daysEarly} days early`);
                } else {
                    reasons.push('meets delivery deadline');
                }
            }
        }

        reasons.push(`${Math.round(score * 100)}% match score`);

        return `Top pick: ${reasons.join(', ')}.`;
    }
}

export const explanationGeneratorService = new ExplanationGeneratorService();
