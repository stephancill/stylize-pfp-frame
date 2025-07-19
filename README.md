# Stephan's Frames v2 Starter

This is an opinionated starter for building v2 frames with AI-powered image generation capabilities.

## Stack

- **Frontend**: Next.js 15 with React 19
- **Database**: PostgreSQL with Kysely query builder
- **Cache/Queue**: Redis with BullMQ for job processing
- **Authentication**: Lucia Auth with Farcaster integration
- **UI**: shadcn/ui components with Tailwind CSS
- **AI**: OpenAI integration for image generation
- **Payments**: Integrated payment system
- **Monitoring**: Sentry for error tracking, PostHog for analytics
- **Deployment**: Docker support

## Features

### Core Features
- **Farcaster Authentication**: Sign in with Farcaster accounts
- **AI Image Generation**: Create images using AI with customizable themes
- **Payment Integration**: Built-in payment system for premium features
- **Job Queue System**: Background processing with BullMQ and Redis
- **Real-time Updates**: Live status updates for image generation jobs
- **Gallery System**: Browse and manage generated images
- **Theme System**: Customizable themes for image generation

### Technical Features
- **Authenticated API Endpoints**: Secure endpoints with Lucia Auth
- **Database Migrations**: Version-controlled schema changes
- **Background Workers**: Scalable job processing system
- **Notification System**: Built-in notification utilities
- **Social Graph Integration**: Farcaster social graph helpers
- **Error Monitoring**: Comprehensive error tracking with Sentry
- **Analytics**: User behavior tracking with PostHog
- **Responsive Design**: Mobile-first design with drawer components
- **Dark/Light Mode**: Theme switching support

## Getting Started

### Prerequisites

- Node.js >= 19
- PNPM (recommended package manager)
- Docker and Docker Compose
- PostgreSQL and Redis (via Docker)

### Database Setup

Start the database services and run migrations:

```bash
# Start PostgreSQL and Redis services
docker-compose up -d

# Run database migrations
pnpm run migrate
```

To reset the database completely:
```bash
pnpm run db:reset
```

### Environment Variables

Copy the `.env.sample` file to `.env` and configure the following variables:

- `APP_URL` - Your application URL (for frame configuration)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `LUCIA_SESSION_SECRET` - Session encryption key
- `OPENAI_API_KEY` - OpenAI API key for image generation
- `SENTRY_DSN` - Sentry error tracking (optional)
- `POSTHOG_KEY` - PostHog analytics key (optional)
- `BULL_BOARD_USERNAME` - Queue monitoring username (optional)
- `BULL_BOARD_PASSWORD` - Queue monitoring password (optional)

### Development

Start the development server:

```bash
pnpm run dev
```

This starts the Next.js development server at `http://localhost:3000`.

### Background Workers

Start the background job processing workers:

```bash
pnpm run workers
```

Monitor the job queue at `http://localhost:3005/` (BullBoard interface).

### Frame Development

To debug frames locally, use the frames.js debugger:

```bash
npx @frames.js/debugger@latest
```

**Important**: Select the Farcaster v2 option in the debugger and ensure you're signed in with your Farcaster account.

#### Testing on External URLs

To test frames on external URLs (ngrok, production):

1. Update `accountAssociations` in `src/app/.well-known/farcaster.json/route.ts`
2. Generate associations using the frames.js debugger or Warpcast app
3. Update the `APP_URL` environment variable to match your test URL

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── (auth)/           # Authentication pages
│   ├── generations/      # Image generation interface
│   └── .well-known/      # Farcaster configuration
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── AuthButton.tsx    # Authentication components
│   ├── CreationsGallery.tsx # Image gallery
│   ├── ThemeSelector.tsx # Theme selection
│   └── PaymentModal.tsx  # Payment interface
├── lib/                  # Utility functions
├── hooks/                # Custom React hooks
├── providers/            # React context providers
├── types/                # TypeScript definitions
├── migrations/           # Database migrations
└── workers/              # Background job workers
```

## API Endpoints

### Authentication
- `POST /api/sign-in` - Farcaster authentication
- `GET /api/user` - Get current user info
- `POST /api/auth/signout` - Sign out

### Image Generation
- `POST /api/generate` - Create new image generation job
- `GET /api/images` - Get user's generated images
- `GET /api/jobs` - Get job status and history

### Themes
- `GET /api/themes` - Get available themes
- `POST /api/themes` - Create custom theme

### Webhooks
- `POST /api/webhooks/*` - Various webhook endpoints

## Authentication

This project uses **Lucia Auth** with Farcaster integration. Create authenticated endpoints using the `withAuth` helper from `src/lib/auth.ts`.

Example:
```typescript
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request, { user }) => {
  // Your authenticated endpoint logic
  return Response.json({ user });
});
```

## Database Customization

### Creating Migrations

1. Create a new migration file in `src/migrations/`
2. Run the migration: `pnpm run migrate`
3. Update `src/types/db.ts` to reflect schema changes

The project uses Kysely's camelCase plugin, so you can use camelCase in TypeScript types while the database uses snake_case.

## Background Jobs

The project uses **BullMQ** with Redis for background job processing:

- **Image Generation**: AI image creation jobs
- **Notifications**: User notification dispatch
- **Cleanup**: Periodic maintenance tasks

Monitor jobs at `http://localhost:3005/` (BullBoard interface).

## Deployment

### Docker

The project includes Docker configuration:

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Environment Variables for Production

Ensure all environment variables are properly configured for production, especially:
- `APP_URL` - Your production domain
- Database and Redis connection strings
- API keys for OpenAI, Sentry, PostHog
- Authentication secrets

## Contributing

1. Follow the coding conventions outlined in `AGENTS.md`
2. Use PNPM for package management
3. Run tests: `pnpm test`
4. Ensure migrations are included for database changes
5. Update this README for significant feature additions

## Additional Documentation

- `AGENTS.md` - Comprehensive development guide
- `SIWE_AUTH_README.md` - Sign-In with Ethereum documentation
- `UNIFIED_AUTH_README.md` - Unified authentication system guide
