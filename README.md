# Stephan's Frames v2 Starter

This is an opinionated starter for building v2 frames

## Stack

- Next.js
- PostgreSQL (with Kysely)
- Redis
- Lucia Auth
- BullMQ
- shadcn/ui

## Features

- Sign in with Farcaster
- Customizable db schema
- Authenticated endpoints
- Notification utils
- Farcaster social graph helpers

## Getting Started

### Database

First, start the database and run the migrations

```
docker-compose up -d
```

```
pnpm run migrate
```

### Environment Variables

Copy the `.env.sample` file to `.env` and fill in the values.

> **Note:** The `APP_URL` environment variable is used to configure the frame. It should be the URL of your local dev server.

### Web

To start your local dev server, run the following command:

```
pnpm run dev
```

This should start the dev server at `http://localhost:3000`. The app is compatible with web and farcaster mini apps.

### Frame

To debug the frame locally, you can use the frames.js debugger, which you can run with the following command:

```
npx @frames.js/debugger@latest
```

Once the debugger is running, you can load the frame in the debugger by entering the URL of your local dev server in the debugger.

> **Note:** Make sure to select the Farcaster v2 option in the debugger next to the "Debug" button and ensure that you are signed in with your Farcaster account and not impersonating another account.

#### Debugging on other URLs

If you want to test the frame on a different URL such as ngrok or a production URL, you can update the `accountAssociations` in `src/app/.well-known/farcaster.json/route.ts` to include the URL you want to test. You can generate account associations in the frames.js debugger or in the Warpcast app (Settings -> Developer -> Domains).

Then update the `APP_URL` environment variable in your `.env` file to the URL you want to test to ensure the correct associations are used.

## Authentication

This project uses Lucia Auth for authentication. You can learn more about it [here](https://lucia-auth.com/).

You can create new authorized endpoints by using the `withAuth` exported from `src/lib/auth.ts`. See the `src/app/api/user/route.ts` file for an example of how to use it.

## Custommization

### Database

To make a change to the database, create a migration file in `src/migrations` and run the following command:

```
pnpm run migrate
```

And update the `src/types/db.ts` file to reflect the new schema. (Kysely camelcase plugin is enabled so you can use camelcase in your types)

## Workers

This project uses a redis queue for dispatching notification jobs.

There is no build step. Just run the workers file

```
pnpm run workers
```

This project uses Bullboard for monitoring the queue. You can access it at `http://localhost:3005/`. In production you can protect this endpoint with a password by setting the `BULL_BOARD_USERNAME` and `BULL_BOARD_PASSWORD` environment variables.
