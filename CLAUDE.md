# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Project Architecture

This is a **LocalConnect** marketplace application - a React-based mobile-first web app that connects local customers with shops through an inquiry/quote system.

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL with PostGIS for geolocation)
- **State Management**: TanStack Query for server state
- **Routing**: React Router DOM
- **Authentication**: Supabase Auth with phone-based OTP system

### Core Business Logic

The app operates on an **inquiry-driven marketplace model**:
1. **Customers** browse shops/products and submit inquiries with requirements
2. **Shop owners** receive inquiries and respond with quotes
3. **Messaging system** enables back-and-forth negotiation
4. **Orders** can be generated from accepted quotes

### Key Database Entities

From `src/integrations/supabase/types.ts`:
- **users**: Customer and shop owner profiles (phone-based auth)
- **shops**: Business listings with geolocation, categories, ratings
- **products**: Shop inventory with pricing, availability, categories
- **inquiries**: Customer requests with budget, quantity, requirements
- **messages**: Communication between customers and shop owners
- **orders**: Finalized transactions from accepted quotes
- **offers**: Shop promotions and discounts
- **user_favorites**: Customer saved items

### Application Flow

**Authentication Flow** (`src/pages/Auth.tsx`, `src/hooks/useAuth.ts`):
- Phone number entry → OTP verification → Profile setup
- Incomplete profiles redirect to setup flow
- App guards all routes behind authentication

**Main Navigation** (`src/components/BottomNav.tsx`):
- Home: Featured shops and products
- Products: Browse/filter product catalog
- Shops: Browse/filter shop directory
- Inquiries: Manage customer inquiry history
- Offers: View shop promotions
- Profile: User settings and account management

**Inquiry System** (Core feature):
- `src/pages/InquiryForm.tsx`: Create new inquiries
- `src/pages/MyInquiries.tsx`: View inquiry history
- `src/pages/InquiryDetail.tsx`: View specific inquiry with messages
- `src/services/inquiryService.ts`: API integration

### File Organization

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui component library
│   └── auth/            # Authentication flow components
├── pages/               # Route components (React Router)
├── hooks/               # Custom React hooks for data/auth
├── services/            # API service layers
├── integrations/        # External service integrations
│   └── supabase/        # Database client and types
├── lib/                 # Utilities and mock data
└── types/               # TypeScript type definitions
```

### Development Notes

**Supabase Integration**:
- Client configured in `src/integrations/supabase/client.ts`
- Row Level Security (RLS) policies control data access
- PostGIS extension enables geolocation features (shop proximity)
- Real-time subscriptions for messaging (implemented via TanStack Query)

**Component Patterns**:
- Uses shadcn/ui design system with consistent styling
- Mobile-first responsive design
- Form validation with React Hook Form + Zod schemas
- Loading states and error handling throughout

**Data Fetching**:
- Custom hooks in `src/hooks/` wrap TanStack Query
- Mock data in `src/lib/` for development when Supabase unavailable
- Optimistic updates for better UX

**Styling System**:
- CSS custom properties for theming in `src/index.css`
- Tailwind config extends with custom colors, spacing, fonts
- Inter font family used throughout
- Dark mode support via class-based toggle

## Important Implementation Details

- **Mobile-first**: UI optimized for mobile devices with touch interactions
- **Geolocation**: Uses PostGIS for proximity-based shop discovery
- **Real-time**: Message updates and inquiry status changes happen live
- **Image handling**: Supabase Storage for user-uploaded content
- **Search**: Full-text search on products/shops using PostgreSQL search vectors
- **Analytics**: Event tracking system for user behavior analysis

This is a Lovable project that can be edited via the web interface or locally with standard Git workflow.