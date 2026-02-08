import { prisma } from '../../config/index.js';
import { ProductWithRetailer, RankedCart, RetailerSummary, RankingExplanation } from '../../types/index.js';
import { ShoppingSpec } from '../../schemas/index.js';
import { explanationGeneratorService } from '../ai/index.js';

interface ScoringWeights {
    price: number;
    delivery: number;
    preferenceMatch: number;
    setCoherence: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
    price: 0.35,
    delivery: 0.25,
    preferenceMatch: 0.25,
    setCoherence: 0.15,
};

export class RankingService {
    private weights: ScoringWeights = DEFAULT_WEIGHTS;

    /**
     * Generate multiple cart options and rank them
     */
    async generateRankedCarts(
        sessionId: string,
        products: ProductWithRetailer[],
        shoppingSpec: ShoppingSpec
    ): Promise<RankedCart[]> {
        // Group products by category
        const productsByCategory = this.groupByCategory(products);

        // Generate different cart strategies
        const cartStrategies = [
            { name: 'Best Value', prioritize: 'price' as const },
            { name: 'Fastest Delivery', prioritize: 'delivery' as const },
            { name: 'Premium Choice', prioritize: 'quality' as const },
        ];

        const rankedCarts: RankedCart[] = [];

        for (const strategy of cartStrategies) {
            const cart = await this.buildCart(
                sessionId,
                productsByCategory,
                shoppingSpec,
                strategy
            );

            if (cart) {
                rankedCarts.push(cart);
            }
        }

        // Sort by score descending
        rankedCarts.sort((a, b) => b.score - a.score);

        return rankedCarts;
    }

    /**
     * Build a cart based on strategy
     */
    private async buildCart(
        sessionId: string,
        productsByCategory: Map<string, ProductWithRetailer[]>,
        shoppingSpec: ShoppingSpec,
        strategy: { name: string; prioritize: 'price' | 'delivery' | 'quality' }
    ): Promise<RankedCart | null> {
        const selectedItems: ProductWithRetailer[] = [];
        let totalCost = 0;
        let maxDeliveryDays = 0;

        // Select one product per category based on strategy
        for (const [_category, products] of productsByCategory) {
            if (products.length === 0) continue;

            let selected: ProductWithRetailer;

            switch (strategy.prioritize) {
                case 'price':
                    // Select cheapest
                    selected = products.reduce((min, p) =>
                        Number(p.price) < Number(min.price) ? p : min
                    );
                    break;
                case 'delivery':
                    // Select fastest delivery
                    selected = products.reduce((fastest, p) =>
                        p.deliveryDays < fastest.deliveryDays ? p : fastest
                    );
                    break;
                case 'quality':
                    // Select most expensive (proxy for quality in demo)
                    selected = products.reduce((max, p) =>
                        Number(p.price) > Number(max.price) ? p : max
                    );
                    break;
            }

            selectedItems.push(selected);
            totalCost += Number(selected.price);
            maxDeliveryDays = Math.max(maxDeliveryDays, selected.deliveryDays);
        }

        // Check budget constraint
        if (shoppingSpec.constraints.budget && totalCost > shoppingSpec.constraints.budget) {
            // Try to optimize
            if (strategy.prioritize !== 'price') {
                return null; // Skip this cart if over budget and not price-focused
            }
        }

        // Calculate score
        const score = this.calculateScore(
            totalCost,
            maxDeliveryDays,
            shoppingSpec,
            selectedItems
        );

        // Calculate delivery date
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + maxDeliveryDays);

        // Group by retailer
        const retailerBreakdown = this.calculateRetailerBreakdown(selectedItems);

        // Generate explanation
        const explanation = await explanationGeneratorService.generateQuickExplanation(
            score,
            totalCost,
            shoppingSpec.constraints.budget,
            maxDeliveryDays,
            shoppingSpec.constraints.deadline
        );

        // Save cart to database
        const savedCart = await prisma.cart.create({
            data: {
                sessionId,
                name: strategy.name,
                totalCost,
                score,
                explanation,
                deliveryDate,
                items: {
                    create: selectedItems.map(item => ({
                        productId: item.id,
                        variantId: item.variants?.[1]?.id, // Default to M size
                        quantity: 1,
                        unitPrice: Number(item.price),
                        totalPrice: Number(item.price),
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: { retailer: true },
                        },
                    },
                },
            },
        });

        return {
            id: savedCart.id,
            name: strategy.name,
            totalCost,
            score,
            explanation,
            deliveryDate,
            items: savedCart.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                product: item.product as unknown as ProductWithRetailer,
                variant: item.variantId ? { id: item.variantId } : undefined,
            })),
            retailerBreakdown,
        };
    }

    /**
     * Calculate composite score for a cart
     */
    private calculateScore(
        totalCost: number,
        deliveryDays: number,
        spec: ShoppingSpec,
        items: ProductWithRetailer[]
    ): number {
        let score = 0;

        // Price score (higher is better when under budget)
        if (spec.constraints.budget) {
            const priceScore = Math.max(0, 1 - (totalCost / spec.constraints.budget));
            score += priceScore * this.weights.price;
        } else {
            score += 0.5 * this.weights.price;
        }

        // Delivery score
        if (spec.constraints.deadline) {
            const deadline = new Date(spec.constraints.deadline);
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

            if (deliveryDate <= deadline) {
                const daysEarly = Math.ceil((deadline.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
                score += Math.min(1, daysEarly / 7) * this.weights.delivery;
            }
        } else {
            const deliveryScore = Math.max(0, 1 - (deliveryDays / 10));
            score += deliveryScore * this.weights.delivery;
        }

        // Preference match (simplified)
        const preferenceScore = 0.7; // Placeholder
        score += preferenceScore * this.weights.preferenceMatch;

        // Set coherence (items from fewer retailers = more coherent)
        const uniqueRetailers = new Set(items.map(i => i.retailerId)).size;
        const coherenceScore = Math.max(0, 1 - (uniqueRetailers - 1) / 3);
        score += coherenceScore * this.weights.setCoherence;

        return Math.round(score * 100) / 100;
    }

    /**
     * Group products by category
     */
    private groupByCategory(products: ProductWithRetailer[]): Map<string, ProductWithRetailer[]> {
        const map = new Map<string, ProductWithRetailer[]>();

        for (const product of products) {
            const key = product.category.toLowerCase();
            const existing = map.get(key) || [];
            existing.push(product);
            map.set(key, existing);
        }

        return map;
    }

    /**
     * Calculate retailer breakdown for a cart
     */
    private calculateRetailerBreakdown(items: ProductWithRetailer[]): RetailerSummary[] {
        const retailerMap = new Map<string, RetailerSummary>();

        for (const item of items) {
            const existing = retailerMap.get(item.retailerId);
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + item.deliveryDays);

            if (existing) {
                existing.itemCount += 1;
                existing.subtotal += Number(item.price);
                if (deliveryDate > existing.deliveryDate) {
                    existing.deliveryDate = deliveryDate;
                }
            } else {
                retailerMap.set(item.retailerId, {
                    retailerId: item.retailerId,
                    retailerName: item.retailerName || item.retailer?.name || 'Unknown',
                    itemCount: 1,
                    subtotal: Number(item.price),
                    deliveryDate,
                });
            }
        }

        return Array.from(retailerMap.values());
    }

    /**
     * Get detailed ranking explanation
     */
    async getExplanation(cartId: string): Promise<RankingExplanation | null> {
        const cart = await prisma.cart.findUnique({
            where: { id: cartId },
            include: {
                items: {
                    include: {
                        product: { include: { retailer: true } },
                    },
                },
                session: true,
            },
        });

        if (!cart) return null;

        const shoppingSpec = cart.session.shoppingSpec as unknown as ShoppingSpec;

        const explanation = await explanationGeneratorService.generateExplanation(
            {
                items: cart.items.map(i => ({
                    name: i.product.name,
                    price: Number(i.unitPrice),
                    retailer: i.product.retailer.name,
                })),
                totalCost: Number(cart.totalCost),
                deliveryDate: cart.deliveryDate || new Date(),
                score: cart.score,
            },
            {
                budget: shoppingSpec?.constraints?.budget,
                deadline: shoppingSpec?.constraints?.deadline,
                preferences: shoppingSpec?.niceToHaves,
            },
            [
                { name: 'Price', weight: this.weights.price, score: 0.8 },
                { name: 'Delivery', weight: this.weights.delivery, score: 0.9 },
                { name: 'Preference Match', weight: this.weights.preferenceMatch, score: 0.7 },
                { name: 'Set Coherence', weight: this.weights.setCoherence, score: 0.6 },
            ]
        );

        return {
            ...explanation,
            cartId,
        };
    }
}

export const rankingService = new RankingService();
