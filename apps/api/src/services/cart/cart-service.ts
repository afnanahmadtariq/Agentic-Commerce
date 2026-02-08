import { prisma } from '../../config/index.js';
import { AddToCartInput, OptimizeCartInput } from '../../schemas/index.js';
import { CartWithItems, CartItemWithProduct } from '../../types/index.js';
import { discoveryService } from '../discovery/index.js';

export class CartService {
    /**
     * Get cart by ID with all items
     */
    async getCart(cartId: string): Promise<CartWithItems | null> {
        const cart = await prisma.cart.findUnique({
            where: { id: cartId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                retailer: true,
                                variants: true,
                            },
                        },
                        variant: true,
                    },
                },
            },
        });

        if (!cart) return null;

        return this.formatCart(cart);
    }

    /**
     * Get all carts for a session
     */
    async getSessionCarts(sessionId: string): Promise<CartWithItems[]> {
        const carts = await prisma.cart.findMany({
            where: { sessionId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                retailer: true,
                                variants: true,
                            },
                        },
                        variant: true,
                    },
                },
            },
            orderBy: { score: 'desc' },
        });

        return carts.map(cart => this.formatCart(cart));
    }

    /**
     * Add item to cart
     */
    async addItem(cartId: string, input: AddToCartInput): Promise<CartItemWithProduct> {
        const product = await discoveryService.getProductById(input.productId);

        if (!product) {
            throw new Error('Product not found');
        }

        const variant = input.variantId
            ? product.variants?.find(v => v.id === input.variantId)
            : null;

        const unitPrice = variant?.price || Number(product.price);
        const totalPrice = unitPrice * input.quantity;

        const item = await prisma.cartItem.create({
            data: {
                cartId,
                productId: input.productId,
                variantId: input.variantId,
                quantity: input.quantity,
                unitPrice,
                totalPrice,
            },
            include: {
                product: {
                    include: { retailer: true },
                },
                variant: true,
            },
        });

        // Update cart total
        await this.recalculateCartTotal(cartId);

        return this.formatCartItem(item);
    }

    /**
     * Remove item from cart
     */
    async removeItem(cartId: string, itemId: string): Promise<void> {
        await prisma.cartItem.delete({
            where: { id: itemId, cartId },
        });

        await this.recalculateCartTotal(cartId);
    }

    /**
     * Update item quantity or variant
     */
    async updateItem(
        cartId: string,
        itemId: string,
        updates: { quantity?: number; variantId?: string }
    ): Promise<CartItemWithProduct> {
        const item = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { product: true },
        });

        if (!item) {
            throw new Error('Cart item not found');
        }

        let unitPrice = Number(item.unitPrice);

        // If variant changed, get new price
        if (updates.variantId) {
            const variant = await prisma.productVariant.findUnique({
                where: { id: updates.variantId },
            });
            if (variant?.price) {
                unitPrice = Number(variant.price);
            }
        }

        const quantity = updates.quantity || item.quantity;
        const totalPrice = unitPrice * quantity;

        const updated = await prisma.cartItem.update({
            where: { id: itemId },
            data: {
                quantity,
                variantId: updates.variantId || item.variantId,
                unitPrice,
                totalPrice,
            },
            include: {
                product: {
                    include: { retailer: true },
                },
                variant: true,
            },
        });

        await this.recalculateCartTotal(cartId);

        return this.formatCartItem(updated);
    }

    /**
     * Optimize cart based on goal
     */
    async optimizeCart(cartId: string, input: OptimizeCartInput): Promise<CartWithItems> {
        const cart = await this.getCart(cartId);

        if (!cart) {
            throw new Error('Cart not found');
        }

        // Get all products for the same categories
        const categories = [...new Set(cart.items.map(i => i.product.category))];

        for (const category of categories) {
            const currentItem = cart.items.find(i => i.product.category === category);
            if (!currentItem) continue;

            // Search for alternatives
            const alternatives = await discoveryService.searchProducts({
                query: category,
                category,
                limit: 10,
            });

            let bestAlternative = currentItem.product;

            switch (input.goal) {
                case 'cheaper':
                    // Find cheapest alternative
                    for (const alt of alternatives.products) {
                        if (Number(alt.price) < Number(bestAlternative.price)) {
                            bestAlternative = alt;
                        }
                    }
                    break;

                case 'faster':
                    // Find fastest delivery
                    for (const alt of alternatives.products) {
                        if (alt.deliveryDays < bestAlternative.deliveryDays) {
                            bestAlternative = alt;
                        }
                    }
                    break;

                case 'better_match':
                    // Find highest quality (most expensive as proxy)
                    for (const alt of alternatives.products) {
                        if (Number(alt.price) > Number(bestAlternative.price)) {
                            bestAlternative = alt;
                        }
                    }
                    break;
            }

            // Replace if different
            if (bestAlternative.id !== currentItem.product.id) {
                await this.removeItem(cartId, currentItem.id);
                await this.addItem(cartId, {
                    productId: bestAlternative.id,
                    quantity: currentItem.quantity,
                });
            }
        }

        // Return updated cart
        return (await this.getCart(cartId))!;
    }

    /**
     * Select a cart as the final choice
     */
    async selectCart(sessionId: string, cartId: string): Promise<CartWithItems> {
        // Deselect all other carts
        await prisma.cart.updateMany({
            where: { sessionId },
            data: { isSelected: false },
        });

        // Select this cart
        await prisma.cart.update({
            where: { id: cartId },
            data: { isSelected: true },
        });

        // Update session status
        await prisma.session.update({
            where: { id: sessionId },
            data: { status: 'CART' },
        });

        return (await this.getCart(cartId))!;
    }

    /**
     * Recalculate cart total
     */
    private async recalculateCartTotal(cartId: string): Promise<void> {
        const items = await prisma.cartItem.findMany({
            where: { cartId },
        });

        const totalCost = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

        await prisma.cart.update({
            where: { id: cartId },
            data: { totalCost },
        });
    }

    /**
     * Format cart for response
     */
    private formatCart(cart: any): CartWithItems {
        return {
            ...cart,
            totalCost: Number(cart.totalCost),
            items: cart.items.map((item: any) => this.formatCartItem(item)),
        };
    }

    /**
     * Format cart item for response
     */
    private formatCartItem(item: any): CartItemWithProduct {
        return {
            id: item.id,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            product: {
                ...item.product,
                price: Number(item.product.price),
            },
            variant: item.variant ? {
                id: item.variant.id,
                size: item.variant.size,
                color: item.variant.color,
            } : undefined,
        };
    }
}

export const cartService = new CartService();
