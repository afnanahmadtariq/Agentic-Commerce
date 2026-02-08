import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type StoreState = {
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    // Temporary state for the UI, synced with API via React Query ideally, 
    // but Zustand can hold optimistic updates or local UI state.
    isCartOpen: boolean;
    toggleCart: () => void;
};

export const useStore = create<StoreState>()(
    persist(
        (set) => ({
            sessionId: null,
            setSessionId: (id) => set({ sessionId: id }),
            isCartOpen: false,
            toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
        }),
        {
            name: 'agentic-commerce-storage',
        }
    )
);
