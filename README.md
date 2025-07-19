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

## What Users Can Do

### 🎨 AI Image Stylization
- **Upload Any Image**: Users can upload any photo (profile picture, artwork, etc.)
- **Choose from Preset Themes**: Select from curated artistic styles like:
  - **Studio Ghibli**: Transform images into iconic anime-style artwork
  - **Higher Buddy**: Convert characters into animal representations with retro photography effects
  - **Cinematic Fantasy**: Create mythical/fantasy versions with dramatic lighting and epic backgrounds
- **Custom Prompts**: Write your own detailed prompts for unique transformations
- **Real-time Processing**: Watch as your image is generated with live status updates

### 💰 Crypto Payment System
- **Base Network Integration**: Pay for image generation using cryptocurrency on Base
- **Transparent Pricing**: Clear pricing displayed before generation (default: 0.00001 ETH)
- **Instant Processing**: Payments are verified on-chain and generation starts immediately
- **Referral Rewards**: Earn royalties when others use your successful generations as themes

### 🖼️ Personal Gallery & Sharing
- **Image Gallery**: Browse all your generated images in a beautiful grid layout
- **Infinite Scroll**: Seamlessly load more images as you browse
- **Detailed View**: Click any image to see full details, prompts used, and creation date
- **Download Images**: Save your creations locally in high quality
- **Social Sharing**: Share individual images or use them as templates for others

### 🔄 Theme Discovery & Reuse
- **Community Themes**: Browse themes created by other users based on popular generations
- **Theme Templates**: Use successful generations from others as starting points
- **Usage Analytics**: See how popular your themes are in the community
- **Deep Linking**: Share specific themes via URLs for easy access

### 📱 Multi-Platform Experience
- **Farcaster Frames**: Full integration with Farcaster social network
- **Mini App Support**: Works seamlessly within Farcaster's mobile app
- **Web Interface**: Complete functionality available on desktop browsers
- **Responsive Design**: Optimized experience across all device sizes

### ⚡ Real-time Job Tracking
- **Pending Jobs Monitor**: See all your active image generations in progress
- **Status Updates**: Real-time updates on generation progress and completion
- **Job History**: Track all your past generations and their status
- **Notification System**: Get notified when images are ready (in Farcaster context)

### 🔐 Flexible Authentication
- **Farcaster Login**: Sign in with your Farcaster account for social features
- **Wallet Connection**: Connect Ethereum wallets for direct payment
- **Unified Experience**: Seamless experience regardless of authentication method
- **Secure Sessions**: Lucia Auth provides secure, persistent sessions

## Technical Features

### For Developers
- **Modern Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with Kysely query builder and migrations
- **Queue System**: BullMQ with Redis for reliable background processing
- **Monitoring**: Sentry error tracking and PostHog analytics integration
- **Payment Processing**: On-chain payment verification with viem
- **Image Storage**: Efficient image handling and URL generation
- **API Design**: RESTful APIs with proper authentication and error handling

## How It Works - User Journey

### 1. **Sign In & Upload**
   - Connect your Farcaster account or Ethereum wallet
   - Upload any image you want to transform (profile pic, photo, artwork)

### 2. **Choose Your Style**
   - **Browse Themes**: Select from popular community-created themes
   - **Use Presets**: Pick from curated styles (Studio Ghibli, Fantasy, etc.)
   - **Custom Prompt**: Write your own detailed transformation instructions
   - **Preview**: See example outputs before committing

### 3. **Pay & Generate**
   - Review the prompt and pricing (typically 0.00001 ETH on Base)
   - Complete payment through your connected wallet
   - Watch real-time status updates as your image is generated

### 4. **View & Share**
   - Download your high-quality generated image
   - Share individual creations on social media
   - Browse your personal gallery of all generated images
   - Let others use your successful generations as themes (earn referral rewards)

### 5. **Discover & Iterate**
   - Explore themes created by other users
   - Use popular generations as starting points for your own creations
   - Build on successful styles and contribute to the community

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
