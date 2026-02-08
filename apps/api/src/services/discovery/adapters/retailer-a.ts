import { ProductWithRetailer } from '../../../types/index.js';
import { RetailerAdapter, SearchFilters } from '../discovery-service.js';

// Mock product data for Retailer A (Outdoor/Sports gear)
const mockProducts = [
    {
        id: 'ra-001',
        externalId: 'RA-SKI-JKT-001',
        name: 'Alpine Pro Ski Jacket',
        description: 'Waterproof and breathable ski jacket with thermal insulation',
        category: 'ski jacket',
        price: 189.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/1a365d/ffffff?text=Ski+Jacket',
        productUrl: 'https://retailer-a.mock/products/ski-jacket-001',
        inStock: true,
        deliveryDays: 3,
    },
    {
        id: 'ra-002',
        externalId: 'RA-SKI-PNT-001',
        name: 'Summit Ski Pants',
        description: 'Insulated ski pants with adjustable waist',
        category: 'ski pants',
        price: 149.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/2d3748/ffffff?text=Ski+Pants',
        productUrl: 'https://retailer-a.mock/products/ski-pants-001',
        inStock: true,
        deliveryDays: 3,
    },
    {
        id: 'ra-003',
        externalId: 'RA-SKI-GLV-001',
        name: 'ThermoGrip Ski Gloves',
        description: 'Waterproof gloves with touchscreen compatibility',
        category: 'ski gloves',
        price: 59.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/4a5568/ffffff?text=Gloves',
        productUrl: 'https://retailer-a.mock/products/ski-gloves-001',
        inStock: true,
        deliveryDays: 2,
    },
    {
        id: 'ra-004',
        externalId: 'RA-SKI-GOG-001',
        name: 'ClearVision Ski Goggles',
        description: 'Anti-fog goggles with UV protection',
        category: 'ski goggles',
        price: 89.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/718096/ffffff?text=Goggles',
        productUrl: 'https://retailer-a.mock/products/ski-goggles-001',
        inStock: true,
        deliveryDays: 2,
    },
    {
        id: 'ra-005',
        externalId: 'RA-SKI-BASE-001',
        name: 'MerinoWarm Base Layer Set',
        description: 'Merino wool base layer top and bottom',
        category: 'base layer',
        price: 79.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/a0aec0/ffffff?text=Base+Layer',
        productUrl: 'https://retailer-a.mock/products/base-layer-001',
        inStock: true,
        deliveryDays: 3,
    },
];

const retailer = {
    id: 'retailer-a',
    name: 'Mountain Gear Pro',
    slug: 'mountain-gear-pro',
    logoUrl: 'https://placehold.co/100x100/1a365d/ffffff?text=MGP',
    baseUrl: 'https://retailer-a.mock',
    isActive: true,
};

export const mockRetailerA: RetailerAdapter = {
    retailerId: 'retailer-a',
    retailerName: 'Mountain Gear Pro',

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
                { id: `${product.id}-s`, size: 'S', color: 'Black', inStock: true },
                { id: `${product.id}-m`, size: 'M', color: 'Black', inStock: true },
                { id: `${product.id}-l`, size: 'L', color: 'Black', inStock: true },
                { id: `${product.id}-xl`, size: 'XL', color: 'Black', inStock: false },
            ],
        })) as unknown as ProductWithRetailer[];
    },
};
