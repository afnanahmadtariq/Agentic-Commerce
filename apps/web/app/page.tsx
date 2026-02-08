'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShoppingBag, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

const EXAMPLE_SCENARIOS = [
  "New born baby essentials, budget $200",
  "Skiing outfit, size M, budget $400, delivery in 5 days",
  "Home office setup under $500",
  "Dinner party for 6, Italian theme"
];

export default function Home() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setSessionId } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);

    try {
      // Create a session and start the flow
      const { data } = await api.post('/sessions', {
        initialMessage: input,
      });

      setSessionId(data.id);

      // Redirect to the session page
      router.push(`/session/${data.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl px-4 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-100 rounded-full">
            <ShoppingBag className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
          Shopping, <span className="text-blue-600">Delegated.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Describe what you want to buy across multiple stores.
          Our AI agent handles the discovery, ranking, and checkout for you.
        </p>

        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Desribe what you need..."
              className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm pr-16"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        <div className="mt-12">
          <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Try an example</p>
          <div className="flex flex-wrap justify-center gap-3">
            {EXAMPLE_SCENARIOS.map((scenario, index) => (
              <button
                key={index}
                onClick={() => setInput(scenario)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
              >
                {scenario}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
