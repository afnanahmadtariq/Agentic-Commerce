import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create retailers
    const retailers = await Promise.all([
        prisma.retailer.upsert({
            where: { slug: 'mountain-gear-pro' },
            update: {},
            create: {
                name: 'Mountain Gear Pro',
                slug: 'mountain-gear-pro',
                logoUrl: 'https://placehold.co/100x100/1a365d/ffffff?text=MGP',
                baseUrl: 'https://mountain-gear-pro.mock',
                isActive: true,
            },
        }),
        prisma.retailer.upsert({
            where: { slug: 'valuesport-outlet' },
            update: {},
            create: {
                name: 'ValueSport Outlet',
                slug: 'valuesport-outlet',
                logoUrl: 'https://placehold.co/100x100/2b6cb0/ffffff?text=VSO',
                baseUrl: 'https://valuesport-outlet.mock',
                isActive: true,
            },
        }),
        prisma.retailer.upsert({
            where: { slug: 'elite-sports-express' },
            update: {},
            create: {
                name: 'Elite Sports Express',
                slug: 'elite-sports-express',
                logoUrl: 'https://placehold.co/100x100/553c9a/ffffff?text=ESE',
                baseUrl: 'https://elite-sports-express.mock',
                isActive: true,
            },
        }),
    ]);

    console.log(`✅ Created ${retailers.length} retailers`);

    // Create products for each retailer
    const productData = [
        // Mountain Gear Pro products
        {
            retailerId: retailers[0].id,
            externalId: 'MGP-SKI-JKT-001',
            name: 'Alpine Pro Ski Jacket',
            description: 'Waterproof and breathable ski jacket with thermal insulation',
            category: 'ski jacket',
            price: 189.99,
            imageUrl: 'https://placehold.co/400x400/1a365d/ffffff?text=Ski+Jacket',
            deliveryDays: 3,
        },
        {
            retailerId: retailers[0].id,
            externalId: 'MGP-SKI-PNT-001',
            name: 'Summit Ski Pants',
            description: 'Insulated ski pants with adjustable waist',
            category: 'ski pants',
            price: 149.99,
            imageUrl: 'https://placehold.co/400x400/2d3748/ffffff?text=Ski+Pants',
            deliveryDays: 3,
        },
        {
            retailerId: retailers[0].id,
            externalId: 'MGP-SKI-GLV-001',
            name: 'ThermoGrip Ski Gloves',
            description: 'Waterproof gloves with touchscreen compatibility',
            category: 'ski gloves',
            price: 59.99,
            imageUrl: 'https://placehold.co/400x400/4a5568/ffffff?text=Gloves',
            deliveryDays: 2,
        },
        // ValueSport Outlet products
        {
            retailerId: retailers[1].id,
            externalId: 'VSO-SKI-JKT-001',
            name: 'Winter Storm Ski Jacket',
            description: 'Affordable waterproof ski jacket',
            category: 'ski jacket',
            price: 119.99,
            imageUrl: 'https://placehold.co/400x400/2b6cb0/ffffff?text=Ski+Jacket',
            deliveryDays: 5,
        },
        {
            retailerId: retailers[1].id,
            externalId: 'VSO-SKI-PNT-001',
            name: 'Snowfall Ski Pants',
            description: 'Budget-friendly insulated ski pants',
            category: 'ski pants',
            price: 89.99,
            imageUrl: 'https://placehold.co/400x400/3182ce/ffffff?text=Ski+Pants',
            deliveryDays: 5,
        },
        // Elite Sports Express products
        {
            retailerId: retailers[2].id,
            externalId: 'ESE-SKI-JKT-001',
            name: 'ProEdge Elite Ski Jacket',
            description: 'Premium Gore-Tex ski jacket with Recco rescue system',
            category: 'ski jacket',
            price: 349.99,
            imageUrl: 'https://placehold.co/400x400/553c9a/ffffff?text=Elite+Jacket',
            deliveryDays: 1,
        },
        {
            retailerId: retailers[2].id,
            externalId: 'ESE-SKI-PNT-001',
            name: 'ProEdge Elite Ski Pants',
            description: 'Premium ski pants with reinforced knees',
            category: 'ski pants',
            price: 279.99,
            imageUrl: 'https://placehold.co/400x400/6b46c1/ffffff?text=Elite+Pants',
            deliveryDays: 1,
        },
    ];

    for (const product of productData) {
        const created = await prisma.product.upsert({
            where: {
                retailerId_externalId: {
                    retailerId: product.retailerId,
                    externalId: product.externalId,
                },
            },
            update: product,
            create: product,
        });

        // Create variants for each product
        const sizes = ['S', 'M', 'L', 'XL'];
        const colors = ['Black', 'Navy', 'Red'];

        for (const size of sizes) {
            for (const color of colors.slice(0, 2)) {
                await prisma.productVariant.upsert({
                    where: {
                        id: `${created.id}-${size}-${color}`.toLowerCase().replace(/\s/g, '-'),
                    },
                    update: {},
                    create: {
                        id: `${created.id}-${size}-${color}`.toLowerCase().replace(/\s/g, '-'),
                        productId: created.id,
                        size,
                        color,
                        inStock: Math.random() > 0.2, // 80% in stock
                    },
                });
            }
        }
    }

    console.log(`✅ Created ${productData.length} products with variants`);

    console.log('🎉 Database seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
