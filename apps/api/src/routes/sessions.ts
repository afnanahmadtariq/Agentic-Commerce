import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../config/index.js';
import { createSessionSchema, updateSessionSchema, shoppingSpecSchema } from '../schemas/index.js';
import { discoveryService, rankingService, intentParserService } from '../services/index.js';

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
    // Create new session
    fastify.post('/', {
        schema: {
            tags: ['Sessions'],
            summary: 'Create a new shopping session',
            body: {
                type: 'object',
                properties: {
                    initialMessage: { type: 'string' },
                },
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const body = createSessionSchema.parse(request.body);

        const session = await prisma.session.create({
            data: {
                status: 'BRIEFING',
            },
        });

        // If initial message provided, parse intent
        if (body.initialMessage) {
            const parsed = await intentParserService.parseIntent({
                message: body.initialMessage,
                sessionId: session.id,
            });

            // Update session with parsed spec
            await prisma.session.update({
                where: { id: session.id },
                data: {
                    shoppingSpec: {
                        scenario: parsed.scenario,
                        mustHaves: parsed.rawItems,
                        niceToHaves: [],
                        constraints: parsed.extractedConstraints,
                    },
                },
            });

            return reply.status(201).send({
                id: session.id,
                status: session.status,
                createdAt: session.createdAt.toISOString(),
                parsedIntent: parsed,
            });
        }

        return reply.status(201).send({
            id: session.id,
            status: session.status,
            createdAt: session.createdAt.toISOString(),
        });
    });

    // Get session by ID
    fastify.get('/:id', {
        schema: {
            tags: ['Sessions'],
            summary: 'Get session details',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const session = await prisma.session.findUnique({
            where: { id },
            include: {
                carts: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    include: { retailer: true },
                                },
                            },
                        },
                    },
                    orderBy: { score: 'desc' },
                },
                checkouts: true,
            },
        });

        if (!session) {
            return reply.notFound('Session not found');
        }

        return session;
    });

    // Update session shopping spec
    fastify.patch('/:id', {
        schema: {
            tags: ['Sessions'],
            summary: 'Update session shopping specification',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = updateSessionSchema.parse(request.body);

        const session = await prisma.session.update({
            where: { id },
            data: {
                status: body.status,
                shoppingSpec: body.shoppingSpec as any,
            },
        });

        return session;
    });

    // Start discovery process for session
    fastify.post('/:id/discover', {
        schema: {
            tags: ['Sessions'],
            summary: 'Start product discovery for session',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        // Get session
        const session = await prisma.session.findUnique({
            where: { id },
        });

        if (!session) {
            return reply.notFound('Session not found');
        }

        if (!session.shoppingSpec) {
            return reply.badRequest('Shopping specification not set');
        }

        // Update status to discovering
        await prisma.session.update({
            where: { id },
            data: { status: 'DISCOVERING' },
        });

        const spec = shoppingSpecSchema.parse(session.shoppingSpec);

        // Search for products based on spec
        const allProducts = [];
        const searchTerms = [...spec.mustHaves, spec.scenario];

        for (const term of searchTerms) {
            const results = await discoveryService.searchProducts({
                query: term,
                maxPrice: spec.constraints.budget,
                limit: 15,
            });
            allProducts.push(...results.products);
        }

        // Generate ranked carts
        await prisma.session.update({
            where: { id },
            data: { status: 'RANKING' },
        });

        const rankedCarts = await rankingService.generateRankedCarts(
            id,
            allProducts,
            spec
        );

        // Update status
        await prisma.session.update({
            where: { id },
            data: { status: 'CART' },
        });

        return {
            productsFound: allProducts.length,
            cartsGenerated: rankedCarts.length,
            carts: rankedCarts,
        };
    });
};

export default sessionRoutes;
