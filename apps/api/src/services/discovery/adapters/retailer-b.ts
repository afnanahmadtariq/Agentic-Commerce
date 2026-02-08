import { ProductWithRetailer } from '../../../types/index.js';
import { RetailerAdapter, SearchFilters } from '../discovery-service.js';

// Mock product data for Retailer B (Budget-friendly options)
const mockProducts = [
    {
        id: 'rb-001',
        externalId: 'RB-SKI-JKT-001',
        name: 'Winter Storm Ski Jacket',
        description: 'Affordable waterproof ski jacket',
        category: 'ski jacket',
        price: 119.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/2b6cb0/ffffff?text=Ski+Jacket',
        productUrl: 'https://retailer-b.mock/products/ski-jacket-001',
        inStock: true,
        deliveryDays: 5,
    },
    {
        id: 'rb-002',
        externalId: 'RB-SKI-PNT-001',
        name: 'Snowfall Ski Pants',
        description: 'Budget-friendly insulated ski pants',
        category: 'ski pants',
        price: 89.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/3182ce/ffffff?text=Ski+Pants',
        productUrl: 'https://retailer-b.mock/products/ski-pants-001',
        inStock: true,
        deliveryDays: 5,
    },
    {
        id: 'rb-003',
        externalId: 'RB-SKI-GLV-001',
        name: 'FrostGuard Gloves',
        description: 'Warm and affordable ski gloves',
        category: 'ski gloves',
        price: 34.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/4299e1/ffffff?text=Gloves',
        productUrl: 'https://retailer-b.mock/products/gloves-001',
        inStock: true,
        deliveryDays: 4,
    },
    {
        id: 'rb-004',
        externalId: 'RB-SKI-GOG-001',
        name: 'SnowView Goggles',
        description: 'Basic ski goggles with anti-fog coating',
        category: 'ski goggles',
        price: 44.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/63b3ed/ffffff?text=Goggles',
        productUrl: 'https://retailer-b.mock/products/goggles-001',
        inStock: true,
        deliveryDays: 4,
    },
    {
        id: 'rb-005',
        externalId: 'RB-SKI-BASE-001',
        name: 'ThermalFlex Base Layer',
        description: 'Synthetic base layer set',
        category: 'base layer',
        price: 49.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/90cdf4/333333?text=Base+Layer',
        productUrl: 'https://retailer-b.mock/products/base-layer-001',
        inStock: true,
        deliveryDays: 5,
    },
];

const retailer = {
    id: 'retailer-b',
    name: 'ValueSport Outlet',
    slug: 'valuesport-outlet',
    logoUrl: 'https://placehold.co/100x100/2b6cb0/ffffff?text=VSO',
    baseUrl: 'https://retailer-b.mock',
    isActive: true,
};

export const mockRetailerB: RetailerAdapter = {
    retailerId: 'retailer-b',
    retailerName: 'ValueSport Outlet',

    async search(query: string, filters: SearchFilters): Promise<ProductWithRetailer[]> {
        const queryLower = query.toLowerCase();

        let results = mockProducts.filter(product => {
            const matchesQuery =
                product.name.toLowerCase().includes(queryLower) ||
                product.description.toLowerCase().includes(queryLower) ||
                product.category.toLowerCase().includes(queryLower);

            const matchesCategory = !filters.category ||
                product.category.toLowerCase().includes(filters.category.toLowerCase());

            const matchesPrice =
                (!filters.minPrice || product.price >= filters.minPrice) &&
                (!filters.maxPrice || product.price <= filters.maxPrice);

            const matchesStock = filters.inStock === undefined || product.inStock === filters.inStock;

            return matchesQuery && matchesCategory && matchesPrice && matchesStock;
        });

        if (filters.limit) {
            results = results.slice(0, filters.limit);
        }

        return results.map(product => ({
            ...product,
            retailerId: retailer.id,
            retailerName: retailer.name,
            retailer,
            variants: [
                { id: `${product.id}-s`, size: 'S', color: 'Navy', inStock: true },
                { id: `${product.id}-m`, size: 'M', color: 'Navy', inStock: true },
                { id: `${product.id}-l`, size: 'L', color: 'Navy', inStock: true },
                { id: `${product.id}-xl`, size: 'XL', color: 'Navy', inStock: true },
            ],
        })) as unknown as ProductWithRetailer[];
    },
};
