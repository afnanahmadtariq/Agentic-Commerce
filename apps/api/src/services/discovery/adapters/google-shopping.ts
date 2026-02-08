import { RetailerAdapter, SearchFilters } from '../discovery-service.js';

/**
 * Google Custom Search Adapter
 * 
 * Fetches real product data using Google Custom Search API
 * with a Programmable Search Engine configured for product searches.
 * 
 * Setup:
 * 1. Create a Programmable Search Engine at https://programmablesearchengine.google.com
 * 2. Enable "Search the entire web"  
 * 3. Get API key from https://console.cloud.google.com
 * 4. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX to .env
 * 
 * Free tier: ~100 queries/day
 */

interface GoogleSearchResponse {
    items?: GoogleSearchItem[];
    searchInformation?: {
        totalResults: string;
        searchTime: number;
    };
    error?: {
        code: number;
        message: string;
    };
}

interface GoogleSearchItem {
    title: string;
    link: string;
    displayLink: string;
    snippet?: string;
    cacheId?: string;
    pagemap?: {
        cse_image?: Array<{ src: string }>;
        product?: Array<{
            name?: string;
            price?: string;
            description?: string;
            image?: string;
            brand?: string;
        }>;
        offer?: Array<{
            price?: string;
            pricecurrency?: string;
            availability?: string;
        }>;
        metatags?: Array<Record<string, string>>;
    };
}

// Internal product type that adapters work with (matches mock adapter pattern)
interface AdapterProduct {
    id: string;
    externalId: string;
    name: string;
    description: string;
    category: string;
    price: number;
    currency: string;
    imageUrl: string;
    productUrl: string;
    inStock: boolean;
    deliveryDays: number;
    retailerId: string;
    retailerName: string;
    retailer: {
        id: string;
        name: string;
        slug: string;
        logoUrl: string;
        baseUrl: string;
        isActive: boolean;
    };
    variants: Array<{
        id: string;
        size?: string;
        color?: string;
        inStock: boolean;
    }>;
}

/**
 * Extract price from various sources in the search result
 */
function extractPrice(item: GoogleSearchItem): number {
    // Try structured product data first
    if (item.pagemap?.offer?.[0]?.price) {
        const price = parseFloat(item.pagemap.offer[0].price.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) return price;
    }

    if (item.pagemap?.product?.[0]?.price) {
        const price = parseFloat(item.pagemap.product[0].price.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) return price;
    }

    // Try metatags
    if (item.pagemap?.metatags?.[0]) {
        const meta = item.pagemap.metatags[0];
        const priceStr = meta['og:price:amount'] || meta['product:price:amount'] || meta['price'];
        if (priceStr) {
            const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
            if (!isNaN(price)) return price;
        }
    }

    // Try to extract from snippet
    if (item.snippet) {
        const match = item.snippet.match(/\$([0-9,]+\.?\d*)/);
        if (match) {
            return parseFloat(match[1].replace(',', ''));
        }
    }

    return 0;
}

/**
 * Extract image URL from search result
 */
function extractImage(item: GoogleSearchItem): string {
    // Try CSE image
    if (item.pagemap?.cse_image?.[0]?.src) {
        return item.pagemap.cse_image[0].src;
    }

    // Try product image
    if (item.pagemap?.product?.[0]?.image) {
        return item.pagemap.product[0].image;
    }

    // Try metatags
    if (item.pagemap?.metatags?.[0]?.['og:image']) {
        return item.pagemap.metatags[0]['og:image'];
    }

    // Fallback placeholder
    return `https://placehold.co/400x400/6366f1/ffffff?text=${encodeURIComponent(item.title.substring(0, 20))}`;
}

/**
 * Map Google Search result to adapter product format
 */
function mapToProduct(item: GoogleSearchItem, index: number): AdapterProduct {
    const price = extractPrice(item);
    const imageUrl = extractImage(item);

    // Create retailer from the display link
    const retailerSlug = item.displayLink.replace(/^www\./, '').replace(/\./g, '-');
    const retailer = {
        id: `web-${retailerSlug}`,
        name: formatRetailerName(item.displayLink),
        slug: retailerSlug,
        logoUrl: `https://www.google.com/s2/favicons?domain=${item.displayLink}&sz=64`,
        baseUrl: `https://${item.displayLink}`,
        isActive: true,
    };

    // Get product name - prefer structured data
    const productName = item.pagemap?.product?.[0]?.name || item.title;

    // Get description
    const description = item.pagemap?.product?.[0]?.description || item.snippet || item.title;

    return {
        id: `gcs-${index}-${Date.now()}`,
        externalId: item.cacheId || `gcs-${index}`,
        name: cleanProductTitle(productName),
        description: description,
        category: '', // Could be inferred from query or structured data
        price,
        currency: 'USD',
        imageUrl,
        productUrl: item.link,
        inStock: checkAvailability(item),
        deliveryDays: estimateDeliveryDays(item.displayLink),
        retailerId: retailer.id,
        retailerName: retailer.name,
        retailer,
        variants: [],
    };
}

/**
 * Format retailer name from domain
 */
function formatRetailerName(displayLink: string): string {
    // Known retailers mapping
    const knownRetailers: Record<string, string> = {
        'amazon.com': 'Amazon',
        'ebay.com': 'eBay',
        'walmart.com': 'Walmart',
        'target.com': 'Target',
        'bestbuy.com': 'Best Buy',
        'newegg.com': 'Newegg',
        'costco.com': 'Costco',
        'homedepot.com': 'Home Depot',
        'lowes.com': "Lowe's",
        'macys.com': "Macy's",
        'nordstrom.com': 'Nordstrom',
        'zappos.com': 'Zappos',
        'rei.com': 'REI',
        'nike.com': 'Nike',
        'adidas.com': 'Adidas',
    };

    const domain = displayLink.replace(/^www\./, '').toLowerCase();

    if (knownRetailers[domain]) {
        return knownRetailers[domain];
    }

    // Format domain as title case
    return domain
        .split('.')[0]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Clean up product title
 */
function cleanProductTitle(title: string): string {
    return title
        .replace(/\s*[-|]\s*.*$/, '') // Remove "- Site Name" or "| Site Name"
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Check product availability from structured data
 */
function checkAvailability(item: GoogleSearchItem): boolean {
    const availability = item.pagemap?.offer?.[0]?.availability?.toLowerCase();
    if (availability) {
        return availability.includes('instock') || availability.includes('in stock');
    }
    return true; // Assume in stock if not specified
}

/**
 * Estimate delivery days based on retailer
 */
function estimateDeliveryDays(displayLink: string): number {
    const domain = displayLink.replace(/^www\./, '').toLowerCase();

    // Fast shipping retailers
    if (domain.includes('amazon') || domain.includes('walmart')) return 2;
    if (domain.includes('target') || domain.includes('bestbuy')) return 3;

    return 5; // Default estimate
}

export const googleShoppingAdapter: RetailerAdapter = {
    retailerId: 'google-shopping',
    retailerName: 'Google Shopping',

    async search(query: string, filters: SearchFilters) {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const cx = process.env.GOOGLE_SEARCH_CX;

        if (!apiKey || !cx) {
            console.warn('⚠️ Google Search API not configured. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX to your .env file.');
            console.warn('   Get your API key from: https://console.cloud.google.com/apis/credentials');
            console.warn('   Get your Search Engine ID from: https://programmablesearchengine.google.com');
            return [];
        }

        try {
            // Build shopping-optimized query
            let searchQuery = query;

            // Add "buy" to help find product pages
            if (!query.toLowerCase().includes('buy') && !query.toLowerCase().includes('shop')) {
                searchQuery = `buy ${query}`;
            }

            // Add price range to query if specified
            if (filters.minPrice && filters.maxPrice) {
                searchQuery += ` price $${filters.minPrice}-$${filters.maxPrice}`;
            } else if (filters.maxPrice) {
                searchQuery += ` under $${filters.maxPrice}`;
            }

            const params = new URLSearchParams({
                key: apiKey,
                cx: cx,
                q: searchQuery,
                num: String(Math.min(filters.limit || 10, 10)), // Max 10 per request
            });

            console.log(`🔍 Searching Google for: "${searchQuery}"`);

            const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
            const data = await response.json() as GoogleSearchResponse;

            if (data.error) {
                console.error('❌ Google Custom Search error:', data.error.message);
                if (data.error.message.includes('does not have the access')) {
                    console.error('   👉 FIX: Enable the Custom Search API at:');
                    console.error('   https://console.cloud.google.com/apis/library/customsearch.googleapis.com');
                }
                return [];
            }

            if (!data.items?.length) {
                console.log('📭 No results found for:', query);
                return [];
            }

            console.log(`✅ Found ${data.items.length} results (${data.searchInformation?.searchTime}s)`);

            let products: AdapterProduct[] = data.items.map((item, index) => mapToProduct(item, index));

            // Filter by price if specified
            if (filters.minPrice) {
                products = products.filter(p => p.price === 0 || p.price >= filters.minPrice!);
            }
            if (filters.maxPrice) {
                products = products.filter(p => p.price === 0 || p.price <= filters.maxPrice!);
            }

            // Filter by category keyword if specified
            if (filters.category) {
                const categoryLower = filters.category.toLowerCase();
                products = products.filter(p =>
                    p.name.toLowerCase().includes(categoryLower) ||
                    p.description.toLowerCase().includes(categoryLower)
                );
            }

            // Cast to expected type (matches mock adapter pattern)
            return products as unknown as ReturnType<RetailerAdapter['search']> extends Promise<infer T> ? T : never;
        } catch (error) {
            console.error('❌ Google Search error:', error);
            return [];
        }
    },
};
