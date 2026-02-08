'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, DollarSign, Star, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface CartViewProps {
    sessionId: string;
    carts?: any[];
}

export default function CartView({ sessionId, carts = [] }: CartViewProps) {
    const router = useRouter();
    const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSelect = async (cartId: string) => {
        setSelectedCartId(cartId);
    };

    const handleProceed = async () => {
        if (!selectedCartId) return;
        setIsSubmitting(true);
        try {
            await api.post(`/cart/${selectedCartId}/select`, { sessionId });
            // The session status will change to CHECKOUT, triggering a re-render in the parent
        } catch (error) {
            console.error("Failed to select cart", error);
            setIsSubmitting(false);
        }
    };

    if (carts.length === 0) {
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-semibold">No carts generated.</h3>
                <p className="text-gray-500">We couldn't find products matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900">We found the best options for you</h2>
                <p className="text-gray-600 mt-2">Select the cart that best fits your needs.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {carts.map((cart, index) => (
                    <CartCard
                        key={cart.id}
                        cart={cart}
                        isSelected={selectedCartId === cart.id}
                        onSelect={() => handleSelect(cart.id)}
                        isBestMatch={index === 0}
                    />
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:bg-transparent md:border-none md:shadow-none flex justify-center">
                <Button
                    size="lg"
                    onClick={handleProceed}
                    disabled={!selectedCartId || isSubmitting}
                    className="w-full md:w-auto min-w-[200px]"
                >
                    {isSubmitting ? 'Processing...' : 'Proceed to Checkout'}
                </Button>
            </div>
            <div className="h-20 md:h-0" /> {/* Spacer for mobile fixed button */}
        </div>
    );
}

function CartCard({ cart, isSelected, onSelect, isBestMatch }: any) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={cn(
                "relative rounded-xl border-2 bg-white transition-all cursor-pointer overflow-hidden flex flex-col",
                isSelected ? "border-blue-600 shadow-md ring-1 ring-blue-600" : "border-gray-200 hover:border-blue-300 shadow-sm"
            )}
            onClick={onSelect}
        >
            {isBestMatch && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    BEST MATCH
                </div>
            )}

            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">{cart.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            <span className="font-medium text-gray-700">{cart.score.toFixed(1)}/10</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">${cart.totalCost.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{cart.items.length} items</div>
                    </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {cart.explanation?.summary || "A balanced selection based on your preferences."}
                </p>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span>Delivers by {new Date(cart.deliveryDate).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Item Preview */}
                <div className="space-y-2 mt-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Includes</div>
                    <div className="flex -space-x-2 overflow-hidden">
                        {cart.items.slice(0, 4).map((item: any, i: number) => (
                            <div key={item.id} className="relative inline-block w-8 h-8 rounded-full ring-2 ring-white bg-gray-100 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.product?.imageUrl || 'https://placehold.co/100x100?text=Prod'} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {cart.items.length > 4 && (
                            <div className="relative inline-block w-8 h-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                                +{cart.items.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div
                className={cn("bg-gray-50 border-t px-5 py-3 text-sm transition-colors", isSelected ? "bg-blue-50 border-blue-100" : "")}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className="w-full flex items-center justify-between text-gray-500 hover:text-gray-900"
                >
                    <span>View Breakdown</span>
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {expanded && (
                <div className="bg-gray-50 px-5 pb-4 text-sm border-t border-dashed border-gray-200">
                    <ul className="space-y-3 mt-3">
                        {cart.items.map((item: any) => (
                            <li key={item.id} className="flex justify-between items-start">
                                <span className="text-gray-600 flex-1 pr-2 truncate">{item.product.name}</span>
                                <span className="font-medium text-gray-900">${item.unitPrice}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    );
}
