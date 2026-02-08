'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const steps = [
    "Analyzing your request...",
    "Searching retailer inventories...",
    "Comparing prices and delivery times...",
    "Checking for discounts...",
    "Optimizing for best value...",
    "Generating cart options..."
];

export default function DiscoveryLoader({ status }: { status: 'DISCOVERING' | 'RANKING' }) {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 1500);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="mb-8"
            >
                <Loader2 className="w-16 h-16 text-blue-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Working on your perfect cart
            </h2>

            <div className="h-8 overflow-hidden relative w-full max-w-md">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={currentStep}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="text-gray-500 absolute w-full"
                    >
                        {steps[currentStep]}
                    </motion.p>
                </AnimatePresence>
            </div>

            <div className="mt-8 w-64 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </div>
    );
}


