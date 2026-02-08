import Fastify from 'fastify';
import { env } from './config/env.js';
import routes from './routes/index.js';

// Import plugins
import corsPlugin from './plugins/cors.js';
import sensiblePlugin from './plugins/sensible.js';
import swaggerPlugin from './plugins/swagger.js';

const app = Fastify({
    logger: {
        level: env.NODE_ENV === 'development' ? 'debug' : 'info',
        transport: env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
    },
});

// Register plugins
await app.register(sensiblePlugin);
await app.register(corsPlugin);
await app.register(swaggerPlugin);

// Register routes with /api prefix
await app.register(routes, { prefix: '/api' });

// Root endpoint
app.get('/', async () => {
    return {
        name: 'Agentic Commerce API',
        version: '1.0.0',
        documentation: '/docs',
        health: '/api/health',
    };
});

// Graceful shutdown
const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    try {
        const { prisma, redis } = await import('./config/index.js');
        await prisma.$disconnect();
        await redis.quit();
        await app.close();
        console.log('✅ Server closed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
    try {
        // Connect to Redis
        const { redis } = await import('./config/index.js');
        await redis.connect();

        // Start Fastify
        await app.listen({
            port: parseInt(env.PORT),
            host: env.HOST
        });

        console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🚀 Agentic Commerce API                            ║
║                                                      ║
║   Server:  http://${env.HOST}:${env.PORT}                     ║
║   Docs:    http://${env.HOST}:${env.PORT}/docs                 ║
║   Health:  http://${env.HOST}:${env.PORT}/api/health           ║
║   Mode:    ${env.NODE_ENV.padEnd(42)}║
║                                                      ║
╚══════════════════════════════════════════════════════╝
    `);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
