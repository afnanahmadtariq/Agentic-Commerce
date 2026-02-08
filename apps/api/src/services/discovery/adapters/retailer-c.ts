import { ProductWithRetailer } from '../../../types/index.js';
import { RetailerAdapter, SearchFilters } from '../discovery-service.js';

// Mock product data for Retailer C (Premium/Fast delivery)
const mockProducts = [
    {
        id: 'rc-001',
        externalId: 'RC-SKI-JKT-001',
        name: 'ProEdge Elite Ski Jacket',
        description: 'Premium Gore-Tex ski jacket with Recco rescue system',
        category: 'ski jacket',
        price: 349.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/553c9a/ffffff?text=Elite+Jacket',
        productUrl: 'https://retailer-c.mock/products/ski-jacket-001',
        inStock: true,
        deliveryDays: 1,
    },
    {
        id: 'rc-002',
        externalId: 'RC-SKI-PNT-001',
        name: 'ProEdge Elite Ski Pants',
        description: 'Premium ski pants with reinforced knees',
        category: 'ski pants',
        price: 279.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/6b46c1/ffffff?text=Elite+Pants',
        productUrl: 'https://retailer-c.mock/products/ski-pants-001',
        inStock: true,
        deliveryDays: 1,
    },
    {
        id: 'rc-003',
        externalId: 'RC-SKI-GLV-001',
        name: 'Primaloft Heated Gloves',
        description: 'Battery-heated premium ski gloves',
        category: 'ski gloves',
        price: 159.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/805ad5/ffffff?text=Heated+Gloves',
        productUrl: 'https://retailer-c.mock/products/gloves-001',
        inStock: true,
        deliveryDays: 1,
    },
    {
        id: 'rc-004',
        externalId: 'RC-SKI-GOG-001',
        name: 'Oakley Flight Deck Goggles',
        description: 'Premium frameless goggles with Prizm lens',
        category: 'ski goggles',
        price: 219.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/9f7aea/ffffff?text=Oakley',
        productUrl: 'https://retailer-c.mock/products/goggles-001',
        inStock: true,
        deliveryDays: 1,
    },
    {
        id: 'rc-005',
        externalId: 'RC-SKI-BASE-001',
        name: 'Smartwool 250 Base Layer',
        description: 'Premium merino wool base layer',
        category: 'base layer',
        price: 159.99,
        currency: 'USD',
        imageUrl: 'https://placehold.co/400x400/b794f4/333333?text=Smartwool',
        productUrl: 'https://retailer-c.mock/products/base-layer-001',
        inStock: true,
        deliveryDays: 1,
    },
];

const retailer = {
    id: 'retailer-c',
    name: 'Elite Sports Express',
    slug: 'elite-sports-express',
    logoUrl: 'https://placehold.co/100x100/553c9a/ffffff?text=ESE',
    baseUrl: 'https://retailer-c.mock',
    isActive: true,
};

export const mockRetailerC: RetailerAdapter = {
    retailerId: 'retailer-c',
    retailerName: 'Elite Sports Express',

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
                { id: `${product.id}-m-red`, size: 'M', color: 'Red', inStock: true },
            ],
        })) as unknown as ProductWithRetailer[];
    },
};
