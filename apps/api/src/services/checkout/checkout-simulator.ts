import { prisma } from '../../config/index.js';
import { StartCheckoutInput } from '../../schemas/index.js';
import { CheckoutSimulation, CheckoutStep, RetailerOrder } from '../../types/index.js';
import { cartService } from '../cart/index.js';

export class CheckoutSimulatorService {
    /**
     * Start a simulated checkout process
     */
    async startCheckout(
        sessionId: string,
        cartId: string,
        input: StartCheckoutInput
    ): Promise<CheckoutSimulation> {
        // Get the selected cart
        const cart = await cartService.getCart(cartId);

        if (!cart) {
            throw new Error('Cart not found');
        }

        // Group items by retailer
        const retailerOrders = this.groupByRetailer(cart.items, input);

        // Create checkout record
        const checkout = await prisma.checkout.create({
            data: {
                sessionId,
                status: 'PROCESSING',
                shippingAddress: input.shippingAddress,
                paymentMethod: {
                    type: input.paymentMethod.type,
                    lastFour: input.paymentMethod.lastFour,
                },
                totalAmount: Number(cart.totalCost),
                retailerOrders: retailerOrders as any,
            },
        });

        // Update session status
        await prisma.session.update({
            where: { id: sessionId },
            data: { status: 'CHECKOUT' },
        });

        return {
            id: checkout.id,
            status: 'PROCESSING',
            steps: this.generateSteps(),
            currentStep: 0,
            retailerOrders,
        };
    }

    /**
     * Get checkout status with simulation progress
     */
    async getCheckoutStatus(checkoutId: string): Promise<CheckoutSimulation | null> {
        const checkout = await prisma.checkout.findUnique({
            where: { id: checkoutId },
        });

        if (!checkout) return null;

        const retailerOrders = checkout.retailerOrders as unknown as RetailerOrder[];
        const steps = this.generateSteps();

        // Simulate progress based on time elapsed
        const elapsedMs = Date.now() - checkout.startedAt.getTime();
        const totalSimulationTime = 10000; // 10 seconds total
        const progress = Math.min(1, elapsedMs / totalSimulationTime);
        const currentStep = Math.floor(progress * steps.length);

        // Update step statuses
        const updatedSteps = steps.map((step, index) => ({
            ...step,
            status: index < currentStep
                ? 'complete' as const
                : index === currentStep
                    ? 'in_progress' as const
                    : 'pending' as const,
            timestamp: index < currentStep ? new Date() : undefined,
        }));

        // Update retailer order statuses
        const updatedRetailerOrders = retailerOrders.map((order, index) => ({
            ...order,
            status: progress > (index + 1) / retailerOrders.length
                ? 'confirmed'
                : 'processing',
            confirmationNumber: progress > (index + 1) / retailerOrders.length
                ? this.generateConfirmationNumber(order.retailerId)
                : undefined,
        }));

        // Check if complete
        if (progress >= 1 && checkout.status !== 'COMPLETE') {
            await prisma.checkout.update({
                where: { id: checkoutId },
                data: {
                    status: 'COMPLETE',
                    completedAt: new Date(),
                    retailerOrders: updatedRetailerOrders as any,
                },
            });

            await prisma.session.update({
                where: { id: checkout.sessionId },
                data: { status: 'COMPLETE' },
            });
        }

        return {
            id: checkout.id,
            status: progress >= 1 ? 'COMPLETE' : 'PROCESSING',
            steps: updatedSteps,
            currentStep,
            retailerOrders: updatedRetailerOrders,
        };
    }

    /**
     * Group cart items by retailer for fanout
     */
    private groupByRetailer(
        items: any[],
        input: StartCheckoutInput
    ): RetailerOrder[] {
        const retailerMap = new Map<string, RetailerOrder>();

        for (const item of items) {
            const retailerId = item.product.retailerId;
            const existing = retailerMap.get(retailerId);

            if (existing) {
                existing.items.push(item);
                existing.subtotal += Number(item.totalPrice);
                existing.total = existing.subtotal + existing.shipping;
            } else {
                const shipping = 9.99; // Fixed shipping per retailer for demo
                retailerMap.set(retailerId, {
                    retailerId,
                    retailerName: item.product.retailer?.name || 'Unknown Retailer',
                    items: [item],
                    subtotal: Number(item.totalPrice),
                    shipping,
                    total: Number(item.totalPrice) + shipping,
                    status: 'pending',
                });
            }
        }

        return Array.from(retailerMap.values());
    }

    /**
     * Generate checkout simulation steps
     */
    private generateSteps(): CheckoutStep[] {
        return [
            {
                name: 'Validating Cart',
                status: 'pending',
                description: 'Verifying all items are in stock and prices are current',
            },
            {
                name: 'Processing Payment',
                status: 'pending',
                description: 'Securely processing your payment information',
            },
            {
                name: 'Splitting Orders',
                status: 'pending',
                description: 'Organizing items by retailer for efficient fulfillment',
            },
            {
                name: 'Submitting to Retailers',
                status: 'pending',
                description: 'Sending orders to each retailer for processing',
            },
            {
                name: 'Confirming Orders',
                status: 'pending',
                description: 'Receiving confirmation from all retailers',
            },
        ];
    }

    /**
     * Generate a fake confirmation number
     */
    private generateConfirmationNumber(retailerId: string): string {
        const prefix = retailerId.substring(0, 2).toUpperCase();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `${prefix}-${random}`;
    }

    /**
     * Get checkout summary
     */
    async getCheckoutSummary(checkoutId: string) {
        const checkout = await prisma.checkout.findUnique({
            where: { id: checkoutId },
            include: {
                session: true,
            },
        });

        if (!checkout) return null;

        const retailerOrders = checkout.retailerOrders as unknown as RetailerOrder[];

        return {
            id: checkout.id,
            status: checkout.status,
            totalAmount: Number(checkout.totalAmount),
            shippingAddress: checkout.shippingAddress,
            paymentMethod: checkout.paymentMethod,
            retailerOrders,
            startedAt: checkout.startedAt,
            completedAt: checkout.completedAt,
        };
    }
}

export const checkoutSimulatorService = new CheckoutSimulatorService();
