import { FastifyPluginAsync } from 'fastify';
import { rankingService } from '../services/index.js';

const rankingRoutes: FastifyPluginAsync = async (fastify) => {
    // Get ranked carts for session
    fastify.get('/session/:sessionId', {
        schema: {
            tags: ['Ranking'],
            summary: 'Get ranked cart options for a session',
            params: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                },
                required: ['sessionId'],
            },
        },
    }, async (request) => {
        const { sessionId } = request.params as { sessionId: string };

        const { prisma } = await import('../config/index.js');

        const carts = await prisma.cart.findMany({
            where: { sessionId },
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
        });

        return {
            carts: carts.map(cart => ({
                id: cart.id,
                name: cart.name,
                totalCost: Number(cart.totalCost),
                score: cart.score,
                explanation: cart.explanation,
                deliveryDate: cart.deliveryDate,
                isSelected: cart.isSelected,
                itemCount: cart.items.length,
            })),
            total: carts.length,
        };
    });

    // Get detailed explanation for a cart ranking
    fastify.get('/explain/:cartId', {
        schema: {
            tags: ['Ranking'],
            summary: 'Get detailed explanation for cart ranking',
            params: {
                type: 'object',
                properties: {
                    cartId: { type: 'string' },
                },
                required: ['cartId'],
            },
        },
    }, async (request, reply) => {
        const { cartId } = request.params as { cartId: string };

        const explanation = await rankingService.getExplanation(cartId);

        if (!explanation) {
            return reply.notFound('Cart not found');
        }

        return explanation;
    });

    // Compare two carts
    fastify.get('/compare', {
        schema: {
            tags: ['Ranking'],
            summary: 'Compare two carts side by side',
            querystring: {
                type: 'object',
                properties: {
                    cart1: { type: 'string' },
                    cart2: { type: 'string' },
                },
                required: ['cart1', 'cart2'],
            },
        },
    }, async (request, reply) => {
        const { cart1, cart2 } = request.query as { cart1: string; cart2: string };

        const { prisma } = await import('../config/index.js');

        const [cartA, cartB] = await Promise.all([
            prisma.cart.findUnique({
                where: { id: cart1 },
                include: {
                    items: {
                        include: {
                            product: { include: { retailer: true } },
                        },
                    },
                },
            }),
            prisma.cart.findUnique({
                where: { id: cart2 },
                include: {
                    items: {
                        include: {
                            product: { include: { retailer: true } },
                        },
                    },
                },
            }),
        ]);

        if (!cartA || !cartB) {
            return reply.notFound('One or both carts not found');
        }

        const priceDiff = Number(cartA.totalCost) - Number(cartB.totalCost);
        const scoreDiff = cartA.score - cartB.score;

        return {
            comparison: {
                cart1: {
                    id: cartA.id,
                    name: cartA.name,
                    totalCost: Number(cartA.totalCost),
                    score: cartA.score,
                    deliveryDate: cartA.deliveryDate,
                    itemCount: cartA.items.length,
                },
                cart2: {
                    id: cartB.id,
                    name: cartB.name,
                    totalCost: Number(cartB.totalCost),
                    score: cartB.score,
                    deliveryDate: cartB.deliveryDate,
                    itemCount: cartB.items.length,
                },
                differences: {
                    priceDifference: priceDiff,
                    priceWinner: priceDiff < 0 ? cart1 : cart2,
                    scoreDifference: scoreDiff,
                    scoreWinner: scoreDiff > 0 ? cart1 : cart2,
                },
            },
        };
    });
};

export default rankingRoutes;
