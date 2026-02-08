import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/index.js';
import { redis } from '../config/redis.js';

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(rateLimit, {
        max: parseInt(env.RATE_LIMIT_MAX),
        timeWindow: parseInt(env.RATE_LIMIT_TIME_WINDOW),
        redis,
        keyGenerator: (request) => {
            // Use user ID if authenticated, otherwise IP
            return request.user?.id || request.ip;
        },
        errorResponseBuilder: (_request, context) => {
            return {
                statusCode: 429,
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
                retryAfter: Math.ceil(context.ttl / 1000),
            };
        },
    });
};

export default fp(rateLimitPlugin, {
    name: 'rate-limit',
});
