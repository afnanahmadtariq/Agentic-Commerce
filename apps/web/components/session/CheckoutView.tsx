'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Package, Truck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface CheckoutViewProps {
    sessionId: string;
    checkouts?: any[];
}

export default function CheckoutView({ sessionId, checkouts }: CheckoutViewProps) {
    const [checkoutStatus, setCheckoutStatus] = useState<any>(null);
    const [isStarting, setIsStarting] = useState(false);

    // If no checkout exists, we need to start one
    useEffect(() => {
        if (!checkouts || checkouts.length === 0) return;

        // Poll for status if processing
        const checkoutId = checkouts[0].id;
        let pollInterval: NodeJS.Timeout;

        if (checkoutId) {
            const poll = async () => {
                try {
                    const { data } = await api.get(`/checkout/${checkoutId}/status`);
                    setCheckoutStatus(data);

                    if (data.status === 'COMPLETE') {
                        clearInterval(pollInterval);
                    }
                } catch (error) {
                    console.error("Failed to poll checkout status", error);
                }
            };

            poll();
            pollInterval = setInterval(poll, 1500);
        }

        return () => clearInterval(pollInterval);
    }, [checkouts]);

    const startCheckout = async () => {
        setIsStarting(true);
        try {
            // Find the selected cart
            const { data: session } = await api.get(`/sessions/${sessionId}`);
            const selectedCart = session.carts.find((c: any) => c.isSelected);

            if (!selectedCart) {
                console.error("No cart selected");
                return;
            }

            await api.post('/checkout/simulate', {
                sessionId,
                cartId: selectedCart.id,
                shippingAddress: {
                    name: 'Jane Doe',
                    street: '123 Market St',
                    city: 'San Francisco',
                    state: 'CA',
                    zipCode: '94105',
                    country: 'US',
                },
                paymentMethod: {
                    type: 'credit_card',
                    lastFour: '4242',
                    expiryMonth: 12,
                    expiryYear: 2028,
                },
            });
            // The parent will re-render with the new checkout state
        } catch (error) {
            console.error("Failed to start checkout", error);
            setIsStarting(false);
        }
    };

    if (!checkouts?.length && !isStarting) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-2xl font-bold mb-4">Ready to place your order?</h2>
                <Button size="lg" onClick={startCheckout}>
                    Place Order & Pay with One Click
                </Button>
            </div>
        );
    }

    if (!checkoutStatus && isStarting) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin w-10 h-10 text-blue-600 mb-4" />
                <p>Initiating secure checkout...</p>
            </div>
        );
    }

    if (!checkoutStatus) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900">
                    {checkoutStatus.status === 'COMPLETE' ? 'Order Confirmed!' : 'Processing Your Order'}
                </h2>
                <p className="text-gray-600 mt-2">
                    {checkoutStatus.status === 'COMPLETE'
                        ? 'Everything has been ordered for you across multiple stores.'
                        : 'Agent is executing orders across retailers...'}
                </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-12">
                <div className="flex justify-between relative mb-2">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10 rounded-full" />
                    {checkoutStatus.steps.map((step: any, index: number) => {
                        const isComplete = step.status === 'complete';
                        const isProcessing = step.status === 'in_progress';

                        return (
                            <div key={index} className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isComplete ? 'bg-green-500 text-white' :
                                            isProcessing ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'
                                        }`}
                                >
                                    {isComplete ? <Check className="w-5 h-5" /> :
                                        isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                            <span className="text-xs">{index + 1}</span>}
                                </div>
                                <span className={`text-xs mt-2 font-medium ${isProcessing ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {step.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Retailer Breakdowns */}
            <div className="grid md:grid-cols-2 gap-6">
                {checkoutStatus.retailerOrders.map((order: any) => (
                    <motion.div
                        key={order.retailerId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`border rounded-lg p-6 bg-white shadow-sm overflow-hidden relative ${order.status === 'confirmed' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                            }`}
                    >
                        {order.status === 'confirmed' && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl">
                                ORDER PLACED
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white rounded border shadow-sm">
                                <Package className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{order.retailerName}</h3>
                                <p className="text-xs text-gray-500">
                                    {order.status === 'confirmed'
                                        ? `Conf: ${order.confirmationNumber}`
                                        : 'Waitling for confirmation...'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-4">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-600 truncate flex-1">{item.product.name}</span>
                                    <span className="font-medium">${Number(item.totalPrice).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-dashed flex justify-between items-center text-sm">
                            <span className="text-gray-500">Shipping</span>
                            <span className="font-medium">${Number(order.shipping).toFixed(2)}</span>
                        </div>

                        <div className="pt-2 flex justify-between items-center">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {checkoutStatus.status === 'COMPLETE' && (
                <div className="mt-12 text-center">
                    <Button onClick={() => window.location.href = '/'} variant="outline">
                        Start New Shopping Session
                    </Button>
                </div>
            )}
        </div>
    );
}
