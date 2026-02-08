import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '../config/index.js';

const authPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(jwt, {
        secret: env.JWT_SECRET,
        sign: {
            expiresIn: env.JWT_EXPIRES_IN,
        },
    });

    // Decorator to verify JWT (optional auth)
    fastify.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // Decorator for optional auth (doesn't throw if no token)
    fastify.decorate('optionalAuth', async (request, _reply) => {
        try {
            await request.jwtVerify();
        } catch {
            // Ignore - user is not authenticated
        }
    });
};

export default fp(authPlugin, {
    name: 'auth',
});

// Type augmentation for Fastify
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

import { FastifyRequest, FastifyReply } from 'fastify';
