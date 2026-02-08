import { FastifyPluginAsync } from 'fastify';
import { cartService } from '../services/index.js';
import { addToCartSchema, updateCartItemSchema, optimizeCartSchema } from '../schemas/index.js';

const cartRoutes: FastifyPluginAsync = async (fastify) => {
    // Get cart by ID
    fastify.get('/:cartId', {
        schema: {
            tags: ['Cart'],
            summary: 'Get cart details',
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

        const cart = await cartService.getCart(cartId);

        if (!cart) {
            return reply.notFound('Cart not found');
        }

        return cart;
    });

    // Get all carts for a session
    fastify.get('/session/:sessionId', {
        schema: {
            tags: ['Cart'],
            summary: 'Get all carts for a session',
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

        const carts = await cartService.getSessionCarts(sessionId);

        return { carts, total: carts.length };
    });

    // Add item to cart
    fastify.post('/:cartId/items', {
        schema: {
            tags: ['Cart'],
            summary: 'Add item to cart',
            params: {
                type: 'object',
                properties: {
                    cartId: { type: 'string' },
                },
                required: ['cartId'],
            },
            body: {
                type: 'object',
                properties: {
                    productId: { type: 'string' },
                    variantId: { type: 'string' },
                    quantity: { type: 'number' },
                },
                required: ['productId'],
            },
        },
    }, async (request, reply) => {
        const { cartId } = request.params as { cartId: string };
        const input = addToCartSchema.parse(request.body);

        try {
            const item = await cartService.addItem(cartId, input);
            return reply.status(201).send(item);
        } catch (error: any) {
            return reply.badRequest(error.message);
        }
    });

    // Update cart item
    fastify.patch('/:cartId/items/:itemId', {
        schema: {
            tags: ['Cart'],
            summary: 'Update cart item quantity or variant',
            params: {
                type: 'object',
                properties: {
                    cartId: { type: 'string' },
                    itemId: { type: 'string' },
                },
                required: ['cartId', 'itemId'],
            },
            body: {
                type: 'object',
                properties: {
                    quantity: { type: 'number' },
                    variantId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { cartId, itemId } = request.params as { cartId: string; itemId: string };
        const updates = updateCartItemSchema.parse(request.body);

        try {
            const item = await cartService.updateItem(cartId, itemId, updates);
            return item;
        } catch (error: any) {
            return reply.badRequest(error.message);
        }
    });

    // Remove item from cart
    fastify.delete('/:cartId/items/:itemId', {
        schema: {
            tags: ['Cart'],
            summary: 'Remove item from cart',
            params: {
                type: 'object',
                properties: {
                    cartId: { type: 'string' },
                    itemId: { type: 'string' },
                },
                required: ['cartId', 'itemId'],
            },
        },
    }, async (request, reply) => {
        const { cartId, itemId } = request.params as { cartId: string; itemId: string };

        await cartService.removeItem(cartId, itemId);
        return reply.status(204).send();
    });

    // Optimize cart
    fastify.post('/:cartId/optimize', {
        schema: {
            tags: ['Cart'],
            summary: 'Optimize cart for cheaper, faster, or better match',
            params: {
                type: 'object',
                properties: {
                    cartId: { type: 'string' },
                },
                required: ['cartId'],
            },
            body: {
                type: 'object',
                properties: {
                    goal: { type: 'string', enum: ['cheaper', 'faster', 'better_match'] },
                },
                required: ['goal'],
            },
        },
    }, async (request, reply) => {
        const { cartId } = request.params as { cartId: string };
        const input = optimizeCartSchema.parse(request.body);

        try {
            const optimizedCart = await cartService.optimizeCart(cartId, input);
            return optimizedCart;
        } catch (error: any) {
            return reply.badRequest(error.message);
        }
    });

    // Select cart as final choice
    fastify.post('/:cartId/select', {
        schema: {
            tags: ['Cart'],
            summary: 'Select a cart as the final choice for checkout',
            params: {
                type: 'object',
                properties: {
                    cartId: { type: 'string' },
                },
                required: ['cartId'],
            },
            body: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                },
                required: ['sessionId'],
            },
        },
    }, async (request, reply) => {
        const { cartId } = request.params as { cartId: string };
        const { sessionId } = request.body as { sessionId: string };

        try {
            const cart = await cartService.selectCart(sessionId, cartId);
            return cart;
        } catch (error: any) {
            return reply.badRequest(error.message);
        }
    });
};

export default cartRoutes;
