import { FastifyPluginAsync } from 'fastify';
import { checkoutSimulatorService } from '../services/index.js';
import { startCheckoutSchema } from '../schemas/index.js';

const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
    // Start simulated checkout
    fastify.post('/simulate', {
        schema: {
            tags: ['Checkout'],
            summary: 'Start simulated checkout process',
            body: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                    cartId: { type: 'string' },
                    shippingAddress: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            street: { type: 'string' },
                            city: { type: 'string' },
                            state: { type: 'string' },
                            zipCode: { type: 'string' },
                            country: { type: 'string' },
                        },
                        required: ['name', 'street', 'city', 'state', 'zipCode'],
                    },
                    paymentMethod: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['credit_card', 'debit_card', 'paypal'] },
                            lastFour: { type: 'string' },
                            expiryMonth: { type: 'number' },
                            expiryYear: { type: 'number' },
                        },
                        required: ['type', 'lastFour', 'expiryMonth', 'expiryYear'],
                    },
                },
                required: ['sessionId', 'cartId', 'shippingAddress', 'paymentMethod'],
            },
        },
    }, async (request, reply) => {
        const body = request.body as {
            sessionId: string;
            cartId: string;
            shippingAddress: any;
            paymentMethod: any;
        };

        const input = startCheckoutSchema.parse({
            shippingAddress: body.shippingAddress,
            paymentMethod: body.paymentMethod,
        });

        try {
            const simulation = await checkoutSimulatorService.startCheckout(
                body.sessionId,
                body.cartId,
                input
            );

            return reply.status(201).send(simulation);
        } catch (error: any) {
            return reply.badRequest(error.message);
        }
    });

    // Get checkout status
    fastify.get('/:checkoutId/status', {
        schema: {
            tags: ['Checkout'],
            summary: 'Get checkout simulation status and progress',
            params: {
                type: 'object',
                properties: {
                    checkoutId: { type: 'string' },
                },
                required: ['checkoutId'],
            },
        },
    }, async (request, reply) => {
        const { checkoutId } = request.params as { checkoutId: string };

        const status = await checkoutSimulatorService.getCheckoutStatus(checkoutId);

        if (!status) {
            return reply.notFound('Checkout not found');
        }

        return status;
    });

    // Get checkout summary
    fastify.get('/:checkoutId/summary', {
        schema: {
            tags: ['Checkout'],
            summary: 'Get final checkout summary',
            params: {
                type: 'object',
                properties: {
                    checkoutId: { type: 'string' },
                },
                required: ['checkoutId'],
            },
        },
    }, async (request, reply) => {
        const { checkoutId } = request.params as { checkoutId: string };

        const summary = await checkoutSimulatorService.getCheckoutSummary(checkoutId);

        if (!summary) {
            return reply.notFound('Checkout not found');
        }

        return summary;
    });

    // Demo: Get sample checkout data
    fastify.get('/demo/sample-data', {
        schema: {
            tags: ['Checkout'],
            summary: 'Get sample checkout data for demo purposes',
        },
    }, async () => {
        return {
            sampleShippingAddress: {
                name: 'Sam Johnson',
                street: '123 Ski Resort Way',
                city: 'Aspen',
                state: 'CO',
                zipCode: '81611',
                country: 'US',
            },
            samplePaymentMethod: {
                type: 'credit_card',
                lastFour: '4242',
                expiryMonth: 12,
                expiryYear: 2026,
            },
        };
    });
};

export default checkoutRoutes;
