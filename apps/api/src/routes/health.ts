import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
    // Basic health check
    fastify.get('/health', {
        schema: {
            tags: ['Health'],
            summary: 'Health check endpoint',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' },
                        version: { type: 'string' },
                    },
                },
            },
        },
    }, async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        };
    });

    // Detailed health check
    fastify.get('/health/ready', {
        schema: {
            tags: ['Health'],
            summary: 'Readiness check with dependency status',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        checks: {
                            type: 'object',
                            properties: {
                                database: { type: 'string' },
                                redis: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async () => {
        const { prisma, redis } = await import('../config/index.js');

        let dbStatus = 'ok';
        let redisStatus = 'ok';

        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch {
            dbStatus = 'error';
        }

        try {
            await redis.ping();
        } catch {
            redisStatus = 'error';
        }

        const status = dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded';

        return {
            status,
            checks: {
                database: dbStatus,
                redis: redisStatus,
            },
        };
    });
};

export default healthRoutes;
