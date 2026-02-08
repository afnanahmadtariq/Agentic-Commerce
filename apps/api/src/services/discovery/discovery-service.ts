import { prisma } from '../../config/index.js';
import { SearchProductsInput } from '../../schemas/index.js';
import { DiscoveryResult, ProductWithRetailer } from '../../types/index.js';

// Mock retailer adapters - will be replaced with real API calls
import { mockRetailerA } from './adapters/retailer-a.js';
import { mockRetailerB } from './adapters/retailer-b.js';
import { mockRetailerC } from './adapters/retailer-c.js';

export interface RetailerAdapter {
    retailerId: string;
    retailerName: string;
    search(query: string, filters: SearchFilters): Promise<ProductWithRetailer[]>;
}

export interface SearchFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    limit?: number;
}

export class DiscoveryService {
    private adapters: RetailerAdapter[] = [
        mockRetailerA,
        mockRetailerB,
        mockRetailerC,
    ];

    async searchProducts(input: SearchProductsInput): Promise<DiscoveryResult> {
        const startTime = Date.now();

        const filters: SearchFilters = {
            category: input.category,
            minPrice: input.minPrice,
            maxPrice: input.maxPrice,
            inStock: input.inStock,
            limit: Math.ceil(input.limit / this.adapters.length),
        };

        // Filter adapters if specific retailers requested
        const activeAdapters = input.retailers?.length
            ? this.adapters.filter(a => input.retailers!.includes(a.retailerId))
            : this.adapters;

        // Search all retailers in parallel
        const results = await Promise.allSettled(
            activeAdapters.map(adapter => adapter.search(input.query, filters))
        );

        // Collect successful results
        const products: ProductWithRetailer[] = [];
        const retailers: string[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                products.push(...result.value);
                retailers.push(activeAdapters[index].retailerName);
            } else {
                console.error(`Retailer ${activeAdapters[index].retailerName} search failed:`, result.reason);
            }
        });

        // Sort by relevance (price for now, can add ML scoring later)
        products.sort((a, b) => Number(a.price) - Number(b.price));

        // Limit total results
        const limitedProducts = products.slice(0, input.limit);

        const searchTime = Date.now() - startTime;

        return {
            products: limitedProducts,
            totalFound: products.length,
            retailers,
            searchTime,
        };
    }

    async getProductById(productId: string): Promise<ProductWithRetailer | null> {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                retailer: true,
                variants: true,
            },
        });

        if (!product) return null;

        return {
            ...product,
            price: Number(product.price),
        } as unknown as ProductWithRetailer;
    }

    async getProductsByCategory(category: string, limit = 20): Promise<ProductWithRetailer[]> {
        const products = await prisma.product.findMany({
            where: {
                category: { contains: category, mode: 'insensitive' },
                inStock: true,
            },
            include: {
                retailer: true,
                variants: true,
            },
            take: limit,
            orderBy: { price: 'asc' },
        });

        return products.map(p => ({
            ...p,
            price: Number(p.price),
        })) as unknown as ProductWithRetailer[];
    }
}

export const discoveryService = new DiscoveryService();
