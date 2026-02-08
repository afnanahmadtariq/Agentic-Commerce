import { FastifyPluginAsync } from 'fastify';
import { discoveryService } from '../services/index.js';
import { searchProductsSchema } from '../schemas/index.js';

const discoveryRoutes: FastifyPluginAsync = async (fastify) => {
    // Search products across retailers
    fastify.post('/search', {
        schema: {
            tags: ['Discovery'],
            summary: 'Search products across all retailers',
            body: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    category: { type: 'string' },
                    minPrice: { type: 'number' },
                    maxPrice: { type: 'number' },
                    retailers: { type: 'array', items: { type: 'string' } },
                    inStock: { type: 'boolean' },
                    limit: { type: 'number' },
                },
                required: ['query'],
            },
        },
    }, async (request, reply) => {
        const input = searchProductsSchema.parse(request.body);

        try {
            const result = await discoveryService.searchProducts(input);
            return result;
        } catch (error) {
            fastify.log.error(error);
            return reply.internalServerError('Product search failed');
        }
    });

    // Get product by ID
    fastify.get('/products/:id', {
        schema: {
            tags: ['Discovery'],
            summary: 'Get product details by ID',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        const product = await discoveryService.getProductById(id);

        if (!product) {
            return reply.notFound('Product not found');
        }

        return product;
    });

    // Get products by category
    fastify.get('/categories/:category', {
        schema: {
            tags: ['Discovery'],
            summary: 'Get products by category',
            params: {
                type: 'object',
                properties: {
                    category: { type: 'string' },
                },
                required: ['category'],
            },
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'number', default: 20 },
                },
            },
        },
    }, async (request) => {
        const { category } = request.params as { category: string };
        const { limit } = request.query as { limit?: number };

        const products = await discoveryService.getProductsByCategory(
            category,
            limit || 20
        );

        return { products, total: products.length };
    });

    // Get available retailers
    fastify.get('/retailers', {
        schema: {
            tags: ['Discovery'],
            summary: 'Get list of available retailers',
        },
    }, async () => {
        // Return mock retailer info
        return {
            retailers: [
                {
                    id: 'retailer-a',
                    name: 'Mountain Gear Pro',
                    description: 'Premium outdoor and ski equipment',
                    categories: ['ski jacket', 'ski pants', 'ski gloves', 'ski goggles', 'base layer'],
                    deliveryDays: { min: 2, max: 3 },
                },
                {
                    id: 'retailer-b',
                    name: 'ValueSport Outlet',
                    description: 'Affordable sports gear for everyone',
                    categories: ['ski jacket', 'ski pants', 'ski gloves', 'ski goggles', 'base layer'],
                    deliveryDays: { min: 4, max: 5 },
                },
                {
                    id: 'retailer-c',
                    name: 'Elite Sports Express',
                    description: 'Premium gear with fast delivery',
                    categories: ['ski jacket', 'ski pants', 'ski gloves', 'ski goggles', 'base layer'],
                    deliveryDays: { min: 1, max: 1 },
                },
            ],
        };
    });
};

export default discoveryRoutes;
