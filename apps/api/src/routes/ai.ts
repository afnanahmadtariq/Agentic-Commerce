import { FastifyPluginAsync } from 'fastify';
import { intentParserService } from '../services/index.js';
import { prisma } from '../config/index.js';
import { parseIntentSchema, clarifySchema, shoppingSpecSchema } from '../schemas/index.js';

const aiRoutes: FastifyPluginAsync = async (fastify) => {
    // Parse shopping intent from natural language
    fastify.post('/parse-intent', {
        schema: {
            tags: ['AI'],
            summary: 'Parse natural language shopping request',
            body: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    sessionId: { type: 'string' },
                },
                required: ['message'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        scenario: { type: 'string' },
                        extractedConstraints: { type: 'object' },
                        clarifyingQuestions: { type: 'array', items: { type: 'string' } },
                        confidence: { type: 'number' },
                        rawItems: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const input = parseIntentSchema.parse(request.body);

        try {
            const parsed = await intentParserService.parseIntent(input);

            // If session ID provided, update the session
            if (input.sessionId) {
                await prisma.session.update({
                    where: { id: input.sessionId },
                    data: {
                        shoppingSpec: {
                            scenario: parsed.scenario,
                            mustHaves: parsed.rawItems,
                            niceToHaves: [],
                            constraints: {
                                budget: parsed.extractedConstraints.budget,
                                deadline: parsed.extractedConstraints.deadline,
                                sizes: parsed.extractedConstraints.sizes,
                                colors: parsed.extractedConstraints.colors,
                                brandsInclude: parsed.extractedConstraints.brands,
                                currency: 'USD',
                            },
                        },
                    },
                });

                // Log event
                await prisma.sessionEvent.create({
                    data: {
                        sessionId: input.sessionId,
                        eventType: 'intent_parsed',
                        eventData: parsed as any,
                    },
                });
            }

            return parsed;
        } catch (error) {
            fastify.log.error(error);
            return reply.internalServerError('Failed to parse intent');
        }
    });

    // Process clarification response
    fastify.post('/clarify', {
        schema: {
            tags: ['AI'],
            summary: 'Process user clarification response',
            body: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                    response: { type: 'string' },
                },
                required: ['sessionId', 'response'],
            },
        },
    }, async (request, reply) => {
        const input = clarifySchema.parse(request.body);

        // Get current session spec
        const session = await prisma.session.findUnique({
            where: { id: input.sessionId },
        });

        if (!session) {
            return reply.notFound('Session not found');
        }

        const currentSpec = session.shoppingSpec
            ? shoppingSpecSchema.partial().parse(session.shoppingSpec)
            : {};

        try {
            const result = await intentParserService.processClarification(
                input.sessionId,
                currentSpec,
                input.response
            );

            // Update session with clarified spec
            if (result.updatedSpec) {
                const mergedSpec = {
                    ...currentSpec,
                    ...result.updatedSpec,
                    constraints: {
                        ...currentSpec.constraints,
                        ...(result.updatedSpec as any).extractedConstraints,
                    },
                };

                await prisma.session.update({
                    where: { id: input.sessionId },
                    data: {
                        shoppingSpec: mergedSpec as any,
                    },
                });
            }

            // Log event
            await prisma.sessionEvent.create({
                data: {
                    sessionId: input.sessionId,
                    eventType: 'clarification_processed',
                    eventData: result as any,
                },
            });

            return result;
        } catch (error) {
            fastify.log.error(error);
            return reply.internalServerError('Failed to process clarification');
        }
    });

    // Get suggested clarifying questions
    fastify.get('/questions/:sessionId', {
        schema: {
            tags: ['AI'],
            summary: 'Get clarifying questions for incomplete shopping spec',
            params: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                },
                required: ['sessionId'],
            },
        },
    }, async (request, reply) => {
        const { sessionId } = request.params as { sessionId: string };

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            return reply.notFound('Session not found');
        }

        const spec = session.shoppingSpec as any;
        const questions: string[] = [];

        // Generate questions based on missing info
        if (!spec?.constraints?.budget) {
            questions.push("What's your budget for this purchase?");
        }

        if (!spec?.constraints?.deadline) {
            questions.push('When do you need these items delivered by?');
        }

        if (!spec?.constraints?.sizes) {
            questions.push('What sizes do you need? (e.g., S, M, L, or specific measurements)');
        }

        if (!spec?.constraints?.colors || spec?.constraints?.colors.length === 0) {
            questions.push('Do you have any color preferences?');
        }

        return {
            sessionId,
            questions,
            isComplete: questions.length === 0,
        };
    });
};

export default aiRoutes;
