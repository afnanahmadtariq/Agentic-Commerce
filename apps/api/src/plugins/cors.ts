import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/index.js';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(cors, {
        origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
};

export default fp(corsPlugin, {
    name: 'cors',
});
