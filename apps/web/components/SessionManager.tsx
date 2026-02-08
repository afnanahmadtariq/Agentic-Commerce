'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function SessionManager() {
    const { sessionId, setSessionId } = useStore();
    const router = useRouter();
    const [isInitializing, setIsInitializing] = useState(false);

    useEffect(() => {
        async function initSession() {
            if (!sessionId && !isInitializing) {
                setIsInitializing(true);
                try {
                    // Initialize a session if one doesn't exist
                    const res = await api.post('/sessions', {
                        // No initial message yet, just create session
                    });
                    setSessionId(res.data.id);
                } catch (error) {
                    console.error("Failed to initialize session:", error);
                } finally {
                    setIsInitializing(false);
                }
            }
        }
        initSession();
    }, [sessionId, setSessionId, isInitializing]);

    return null; // This component is logic-only
}
