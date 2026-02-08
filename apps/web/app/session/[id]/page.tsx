'use client';

import { useParams } from 'next/navigation';
import { useSession, useClarifyingQuestions, useClarify } from '@/hooks/useSession';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ChatInterface from '@/components/session/ChatInterface';
import DiscoveryLoader from '@/components/session/DiscoveryLoader';
import CartView from '@/components/session/CartView';
import CheckoutView from '@/components/session/CheckoutView';

export default function SessionPage() {
    const { id } = useParams() as { id: string };
    const { data: session, isLoading, isError } = useSession(id);
    const { data: questions, isLoading: loadingQuestions } = useClarifyingQuestions(id, session?.status || 'BRIEFING');
    const clarifyMutation = useClarify();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center full-h-screen">
                <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
            </div>
        );
    }

    if (isError || !session) {
        return (
            <div className="flex justify-center items-center py-20 text-red-500">
                Session not found or failed to load.
            </div>
        );
    }

    // State Machine for Views
    switch (session.status) {
        case 'BRIEFING':
            return (
                <ChatInterface
                    sessionId={id}
                    initialQuestions={questions?.questions}
                    onComplete={() => {
                        // Usually triggers discovery via backend state change or direct call
                    }}
                />
            );
        case 'DISCOVERING':
        case 'RANKING':
            return <DiscoveryLoader status={session.status} />;
        case 'CART':
            return <CartView sessionId={id} carts={session.carts} />;
        case 'CHECKOUT':
        case 'COMPLETE':
            return <CheckoutView sessionId={id} checkouts={session.checkouts} />;
        default:
            return <div>Unknown session status: {session.status}</div>;
    }
}
