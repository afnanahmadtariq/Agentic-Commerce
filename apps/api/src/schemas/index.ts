import { z } from 'zod';

// ============================================
// SHOPPING SPEC SCHEMAS
// ============================================

export const constraintsSchema = z.object({
    budget: z.number().positive().optional(),
    currency: z.string().default('USD'),
    deadline: z.string().datetime().optional(),
    sizes: z.record(z.string()).optional(),
    colors: z.array(z.string()).optional(),
    brandsInclude: z.array(z.string()).optional(),
    brandsExclude: z.array(z.string()).optional(),
});

export const shoppingSpecSchema = z.object({
    scenario: z.string().min(1),
    mustHaves: z.array(z.string()).default([]),
    niceToHaves: z.array(z.string()).default([]),
    constraints: constraintsSchema,
});

export type ShoppingSpec = z.infer<typeof shoppingSpecSchema>;
export type Constraints = z.infer<typeof constraintsSchema>;

// ============================================
// SESSION SCHEMAS
// ============================================

export const sessionStatusSchema = z.enum([
    'BRIEFING',
    'DISCOVERING',
    'RANKING',
    'CART',
    'CHECKOUT',
    'COMPLETE',
    'FAILED',
]);

export const createSessionSchema = z.object({
    initialMessage: z.string().optional(),
});

export const updateSessionSchema = z.object({
    status: sessionStatusSchema.optional(),
    shoppingSpec: shoppingSpecSchema.optional(),
});

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const productVariantSchema = z.object({
    id: z.string(),
    sku: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    material: z.string().optional(),
    price: z.number().optional(),
    inStock: z.boolean().default(true),
    stockCount: z.number().optional(),
});

export const productSchema = z.object({
    id: z.string(),
    externalId: z.string(),
    retailerId: z.string(),
    retailerName: z.string(),
    name: z.string(),
    description: z.string().optional(),
    category: z.string(),
    price: z.number(),
    currency: z.string().default('USD'),
    imageUrl: z.string().optional(),
    productUrl: z.string().optional(),
    inStock: z.boolean().default(true),
    deliveryDays: z.number().default(5),
    variants: z.array(productVariantSchema).optional(),
});

export type Product = z.infer<typeof productSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;

// ============================================
// CART SCHEMAS
// ============================================

export const addToCartSchema = z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().default(1),
});

export const updateCartItemSchema = z.object({
    quantity: z.number().int().positive().optional(),
    variantId: z.string().optional(),
});

export const optimizeCartSchema = z.object({
    goal: z.enum(['cheaper', 'faster', 'better_match']),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type OptimizeCartInput = z.infer<typeof optimizeCartSchema>;

// ============================================
// CHECKOUT SCHEMAS
// ============================================

export const shippingAddressSchema = z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default('US'),
});

export const paymentMethodSchema = z.object({
    type: z.enum(['credit_card', 'debit_card', 'paypal']),
    lastFour: z.string().length(4),
    expiryMonth: z.number().min(1).max(12),
    expiryYear: z.number().min(2024),
});

export const startCheckoutSchema = z.object({
    shippingAddress: shippingAddressSchema,
    paymentMethod: paymentMethodSchema,
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>;

// ============================================
// AI SCHEMAS
// ============================================

export const parseIntentSchema = z.object({
    message: z.string().min(1),
    sessionId: z.string().optional(),
});

export const clarifySchema = z.object({
    sessionId: z.string(),
    response: z.string(),
});

export type ParseIntentInput = z.infer<typeof parseIntentSchema>;
export type ClarifyInput = z.infer<typeof clarifySchema>;

// ============================================
// DISCOVERY SCHEMAS
// ============================================

export const searchProductsSchema = z.object({
    query: z.string().min(1),
    category: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    retailers: z.array(z.string()).optional(),
    inStock: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).default(20),
});

export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
