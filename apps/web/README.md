# Agentic Commerce Frontend

Frontend application for the Agentic Commerce Platform, built with Next.js 16.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Backend API running on port 3001

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local if needed

# Start development server
pnpm dev
```

The application will be available at **http://localhost:3000**.

## Project Structure

```
apps/web/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Homepage (Scenario input)
│   ├── layout.tsx        # Root layout with providers
│   └── session/[id]/     # Dynamic session page
├── components/           # React components
│   ├── ui/               # Base UI components (Button, Input)
│   └── session/          # Session-specific components (Chat, Cart, etc.)
├── hooks/                # Custom React hooks (useSession)
├── lib/                  # Utilities (API client, cn helper)
├── providers/            # Context providers (QueryProvider)
├── store/                # Zustand store (useStore)
└── public/               # Static assets
```

## Features

- **Conversational Interface**: Start shopping with natural language.
- **Real-time Updates**: Progress indicators for product discovery.
- **Detailed Cart View**: Compare ranked cart options.
- **Simulated Checkout**: Visual checkout flow with multiple retailers.
