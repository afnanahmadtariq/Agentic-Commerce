import { Session, Cart, Product, Retailer, Checkout } from '@prisma/client';

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============================================
// SESSION TYPES
// ============================================

export interface SessionWithDetails extends Session {
    carts: CartWithItems[];
    checkouts: Checkout[];
}

export interface CartWithItems extends Cart {
    items: CartItemWithProduct[];
}

export interface CartItemWithProduct {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: ProductWithRetailer;
    variant?: {
        id: string;
        size?: string;
        color?: string;
    };
}

export interface ProductWithRetailer extends Product {
    retailer: Retailer;
}

// ============================================
// RANKING TYPES
// ============================================

export interface RankedCart {
    id: string;
    name: string;
    totalCost: number;
    score: number;
    explanation: string;
    deliveryDate: Date;
    items: CartItemWithProduct[];
    retailerBreakdown: RetailerSummary[];
}

export interface RetailerSummary {
    retailerId: string;
    retailerName: string;
    itemCount: number;
    subtotal: number;
    deliveryDate: Date;
}

export interface RankingExplanation {
    cartId: string;
    overallReason: string;
    factors: RankingFactor[];
    alternatives: string[];
}

export interface RankingFactor {
    name: string;
    weight: number;
    score: number;
    description: string;
}

// ============================================
// CHECKOUT TYPES
// ============================================

export interface CheckoutSimulation {
    id: string;
    status: string;
    steps: CheckoutStep[];
    currentStep: number;
    retailerOrders: RetailerOrder[];
}

export interface CheckoutStep {
    name: string;
    status: 'pending' | 'in_progress' | 'complete' | 'failed';
    description: string;
    timestamp?: Date;
}

export interface RetailerOrder {
    retailerId: string;
    retailerName: string;
    items: CartItemWithProduct[];
    subtotal: number;
    shipping: number;
    total: number;
    status: string;
    confirmationNumber?: string;
}

// ============================================
// AI TYPES
// ============================================

export interface ParsedIntent {
    scenario: string;
    extractedConstraints: {
        budget?: number;
        deadline?: string;
        sizes?: Record<string, string>;
        colors?: string[];
        brands?: string[];
    };
    clarifyingQuestions?: string[];
    confidence: number;
    rawItems: string[];
}

export interface ClarificationResponse {
    sessionId: string;
    updatedSpec: Partial<ParsedIntent>;
    isComplete: boolean;
    nextQuestion?: string;
}

// ============================================
// DISCOVERY TYPES
// ============================================

export interface DiscoveryResult {
    products: ProductWithRetailer[];
    totalFound: number;
    retailers: string[];
    searchTime: number;
}
