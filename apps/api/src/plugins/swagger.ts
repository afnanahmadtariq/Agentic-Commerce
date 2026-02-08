import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(swagger, {
        openapi: {
            info: {
                title: 'Agentic Commerce API',
                description: 'AI-powered multi-retailer shopping orchestration platform',
                version: '1.0.0',
            },
            servers: [
                {
                    url: 'http://localhost:3001',
                    description: 'Development server',
                },
            ],
            tags: [
                { name: 'Sessions', description: 'Shopping session management' },
                { name: 'AI', description: 'Intent parsing and clarification' },
                { name: 'Discovery', description: 'Product discovery across retailers' },
                { name: 'Ranking', description: 'Cart ranking and explanations' },
                { name: 'Cart', description: 'Cart management and optimization' },
                { name: 'Checkout', description: 'Simulated checkout orchestration' },
                { name: 'Health', description: 'API health checks' },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
        },
    });

    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
        },
    });
};

export default fp(swaggerPlugin, {
    name: 'swagger',
});
