import { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health.js';
import sessionRoutes from './sessions.js';
import aiRoutes from './ai.js';
import discoveryRoutes from './discovery.js';
import cartRoutes from './cart.js';
import rankingRoutes from './ranking.js';
import checkoutRoutes from './checkout.js';

const routes: FastifyPluginAsync = async (fastify) => {
    // Register all route modules
    await fastify.register(healthRoutes);
    await fastify.register(sessionRoutes, { prefix: '/sessions' });
    await fastify.register(aiRoutes, { prefix: '/ai' });
    await fastify.register(discoveryRoutes, { prefix: '/discovery' });
    await fastify.register(cartRoutes, { prefix: '/cart' });
    await fastify.register(rankingRoutes, { prefix: '/ranking' });
    await fastify.register(checkoutRoutes, { prefix: '/checkout' });
};

export default routes;
