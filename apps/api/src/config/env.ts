import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file
config();

const envSchema = z.object({
    // Server
    PORT: z.string().default('3001'),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // OpenAI
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().default('gpt-4o'),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // Rate Limiting
    RATE_LIMIT_MAX: z.string().default('100'),
    RATE_LIMIT_TIME_WINDOW: z.string().default('60000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
