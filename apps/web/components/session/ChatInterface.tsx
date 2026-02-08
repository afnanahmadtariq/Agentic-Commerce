'use client';

import { useState } from 'react';
import { SendHorizonal, Bot, User } from 'lucide-react';
import { useClarify, useStartDiscovery } from '@/hooks/useSession';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

interface ChatInterfaceProps {
    sessionId: string;
    initialQuestions?: string[];
    onComplete: () => void;
}

export default function ChatInterface({ sessionId, initialQuestions = [], onComplete }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init-1',
            role: 'assistant',
            content: initialQuestions.length > 0
                ? `I need a few details to find the best options for you.\n\n${initialQuestions.join('\n\n')}`
                : "I'm analyzing your request. Does everything look correct, or would you like to add any constraints like budget or deadline?"
        },
    ]);
    const [input, setInput] = useState('');
    const [pending, setPending] = useState(false);

    const clarify = useClarify();
    const startDiscovery = useStartDiscovery();

    const handleSend = async () => {
        if (!input.trim() || pending) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setPending(true);

        try {
            // Send clarification to backend
            const result = await clarify.mutateAsync({ sessionId, response: input });

            // If complete, start discovery automatically or suggest it
            if (result.updatedSpec && !result.updatedSpec.needsClarification) {
                // Automatically start discovery if intent seems complete
                await startDiscovery.mutateAsync(sessionId);
                onComplete();
            } else {
                // Add follow-up question
                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: result.followUpQuestion || "Thanks. Is there anything else?",
                };
                setMessages(prev => [...prev, botMsg]);
            }
        } catch (error) {
            console.error("Failed to clarify", error);
        } finally {
            setPending(false);
        }
    };

    const handleStartDiscovery = async () => {
        setPending(true);
        try {
            await startDiscovery.mutateAsync(sessionId);
            onComplete();
        } catch {
            setPending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    Shopping Assistant
                </h2>
                {/* Skip if user wants to just go with best effort */}
                <button
                    onClick={handleStartDiscovery}
                    className="text-xs text-blue-600 hover:underline"
                >
                    Skip & Start Search
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence initial={false}>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                {message.content.split('\n').map((line, i) => (
                                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                    {pending && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-gray-50 rounded-2xl px-4 py-3 rounded-bl-none">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-4 bg-white border-t">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your answer..."
                        className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                        disabled={pending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || pending}
                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <SendHorizonal className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
