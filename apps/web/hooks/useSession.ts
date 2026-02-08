import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type SessionStatus = 'BRIEFING' | 'DISCOVERING' | 'RANKING' | 'CART' | 'CHECKOUT' | 'COMPLETE' | 'FAILED';

export interface ShoppingSpec {
    scenario: string;
    mustHaves: string[];
    niceToHaves: string[];
    constraints: {
        budget?: number;
        deadline?: string;
        sizes?: Record<string, string>;
        colors?: string[];
    };
}

export interface Session {
    id: string;
    status: SessionStatus;
    shoppingSpec?: ShoppingSpec;
    carts?: any[]; // Keep flexible for now
    checkouts?: any[];
}

export function useSession(sessionId: string) {
    return useQuery({
        queryKey: ['session', sessionId],
        queryFn: async () => {
            const { data } = await api.get<Session>(`/sessions/${sessionId}`);
            return data;
        },
        refetchInterval: (data) => {
            if (!data) return false;
            // Poll faster during active processing
            if (['DISCOVERING', 'RANKING', 'CHECKOUT'].includes(data.status)) {
                return 2000;
            }
            return 10000;
        },
        enabled: !!sessionId,
    });
}

export function useStartDiscovery() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            // Trigger discovery on the backend
            const { data } = await api.post(`/sessions/${sessionId}/discover`);
            return data;
        },
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        },
    });
}

export function useClarify() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sessionId, response }: { sessionId: string; response: string }) => {
            const { data } = await api.post('/ai/clarify', { sessionId, response });
            return data;
        },
        onSuccess: (_, { sessionId }) => {
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        },
    });
}

/**
 * Hook to get clarifying questions if session is in BRIEFING
 */
export function useClarifyingQuestions(sessionId: string, status: SessionStatus) {
    return useQuery({
        queryKey: ['questions', sessionId],
        queryFn: async () => {
            const { data } = await api.get(`/ai/questions/${sessionId}`);
            return data;
        },
        enabled: !!sessionId && status === 'BRIEFING',
    });
}
