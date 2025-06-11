# Unified Authentication System

A comprehensive authentication system that supports both **SIWE (Sign-In With Ethereum)** and **Farcaster** authentication methods, built with viem's SIWE utilities, stateless JWT cookies, and Redis-based nonce management.

## Overview

This system provides secure authentication using:

- **SIWE Authentication**: EIP-4361 standard using viem's built-in utilities
- **Farcaster Authentication**: Farcaster SDK integration with message verification
- Unified JWT tokens for both authentication methods
- Redis-based nonce/challenge management with automatic expiry
- Anti-replay protection with single-use nonces
- Complete React integration with TanStack Query

## Dependencies

Core dependencies:

- `viem` - For SIWE message creation, validation, and signature verification
- `@farcaster/auth-client` - For Farcaster message verification
- `wagmi` - For React Ethereum integration
- `@tanstack/react-query` - For state management and caching
- `jsonwebtoken` - For JWT creation and verification
- `redis` - For nonce/challenge storage and management

## Key Features

- **Dual Authentication**: Support for both SIWE and Farcaster authentication
- **Unified JWT System**: Single token format for both authentication methods
- **Stateless Design**: JWT tokens contain all necessary user information
- **Shared Nonce System**: Redis-based challenge/nonce storage for both auth methods
- **Anti-Replay Protection**: Single-use nonces prevent replay attacks
- **Production Ready**: HTTP-only cookies with secure flags
- **React Integration**: Complete hooks and components with loading states
- **Type Safety**: Full TypeScript support for both authentication methods

## Architecture

### Backend Components

- `src/lib/siwe-auth.ts` - Core authentication utilities for both SIWE and Farcaster
- `src/app/api/auth/nonce/route.ts` - Nonce generation for both SIWE and Farcaster
- `src/app/api/auth/signin/route.ts` - SIWE authentication endpoint
- `src/app/api/auth/farcaster/signin/route.ts` - Farcaster authentication endpoint
- `src/app/api/auth/signout/route.ts` - Universal sign out endpoint
- `src/app/api/auth/me/route.ts` - Current user endpoint (supports both auth types)

### Frontend Components

- `src/hooks/useAuth.ts` - Unified React authentication hook
- `src/hooks/useSiweAuth.ts` - Legacy SIWE-specific hook (backward compatibility)
- `src/components/AuthButton.tsx` - Unified sign in/out component
- `src/components/FarcasterAuthExample.tsx` - Farcaster integration example

## Usage Examples

### Unified Authentication Hook

```typescript
import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const {
    isAuthenticated,
    user,
    signInWithSiwe,
    signInWithFarcaster,
    signOut,
    isLoading,
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={signInWithSiwe}>Sign In with Ethereum</button>
        {/* Farcaster sign-in requires SDK integration */}
      </div>
    );
  }

  return (
    <div>
      {user?.authType === "siwe" ? (
        <p>Welcome, {user.address}</p>
      ) : (
        <p>Welcome, FID: {user.fid}</p>
      )}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Farcaster Authentication Integration

```typescript
// Client-side Farcaster integration
const handleFarcasterSignIn = async () => {
  // 1. Get nonce from server (same endpoint as SIWE)
  const nonceResponse = await fetch("/api/auth/nonce");
  const { nonce } = await nonceResponse.json();

  // 2. Use Farcaster SDK
  const result = await sdk.actions.signIn({
    nonce: nonce,
    acceptAuthAddress: true,
  });

  // 3. Authenticate with your backend
  await signInWithFarcaster({
    message: result.message,
    signature: result.signature,
    challengeId: nonce,
  });
};
```

### Protecting API Routes (Unified)

```typescript
import { withAuth, AuthUserRouteHandler } from "@/lib/siwe-auth";

const handler: AuthUserRouteHandler<{
  params: Promise<{ id: string }>;
}> = async (req, user, { params }) => {
  const { id } = await params;

  // Access authenticated user (works for both SIWE and Farcaster)
  if (user.authType === "siwe") {
    console.log("SIWE user address:", user.address);
  } else {
    console.log("Farcaster user FID:", user.fid);
  }

  return NextResponse.json({ message: "Success", user });
};

export const GET = withAuth(handler);
```

### Protecting API Routes (SIWE-only, backward compatibility)

```typescript
import { withSiweAuth, SiweUserRouteHandler } from "@/lib/siwe-auth";

const handler: SiweUserRouteHandler = async (req, user) => {
  // Only SIWE users can access this route
  console.log("SIWE user address:", user.address);
  return NextResponse.json({ message: "SIWE Success", user });
};

export const GET = withSiweAuth(handler);
```

## Configuration

### Environment Variables

```bash
# JWT Secret (required)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# App URL (required for domain validation)
APP_URL=https://yourdomain.com

# Redis Configuration (required)
REDIS_URL=redis://localhost:6379

# Optional: Custom cookie name
SIWE_JWT_COOKIE_NAME=siwe-auth

# Optional: JWT expiration (default: 7d)
SIWE_JWT_EXPIRES_IN=7d
```

### Authentication User Types

```typescript
// Unified auth user interface
interface AuthUser {
  authType: "siwe" | "farcaster";
  // SIWE fields
  address?: string;
  chainId?: number;
  // Farcaster fields
  fid?: number;
  // Common fields
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
}
```

## Security Features

### Shared Nonce/Challenge System

- Generated using viem's `generateSiweNonce()` for cryptographic randomness
- Stored in Redis with 10-minute expiry
- Single-use only (deleted immediately after validation)
- **Single endpoint** `/api/auth/nonce` serves both SIWE and Farcaster authentication
- Prevents replay attacks across both auth methods

### Domain & Origin Validation

- **SIWE**: Domain verification using viem's built-in validation
- **Farcaster**: Domain verification using Farcaster auth client
- **Anti-Spoofing**: Prevents malicious sites from creating valid messages
- **Cross-Domain Protection**: Blocks unauthorized domain authentication

### JWT Security

- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production
- SameSite=Strict prevents CSRF
- 7-day expiration with server-side validation
- Unified format supports both authentication methods

### Message Validation

- **SIWE**: Uses viem's validation and verification utilities
- **Farcaster**: Uses Farcaster auth client verification
- **Nonce Validation**: Redis-based validation for both methods
- **Signature Verification**: Method-specific signature validation
- **Timestamp Validation**: Message freshness validation

## API Endpoints

### Authentication Endpoints

- `GET /api/auth/nonce` - Generate nonce for both SIWE and Farcaster authentication
- `POST /api/auth/signin` - SIWE authentication
- `POST /api/auth/farcaster/signin` - Farcaster authentication
- `POST /api/auth/signout` - Universal sign out
- `GET /api/auth/me` - Get current user (supports both auth types)

### Request/Response Examples

#### Farcaster Sign-In Request

```json
POST /api/auth/farcaster/signin
{
  "message": "farcaster_message_string",
  "signature": "0x...",
  "challengeId": "challenge_from_server"
}
```

#### Unified Auth Response

```json
{
  "authenticated": true,
  "user": {
    "authType": "farcaster",
    "fid": 12345
  }
}
```

## Migration Guide

### From SIWE-only to Unified System

1. **Existing SIWE code continues to work** - backward compatibility maintained
2. **Update imports** - `useAuth` for new unified hook, `useSiweAuth` still available
3. **Route handlers** - `withAuth` for unified, `withSiweAuth` for SIWE-only
4. **User data** - Check `user.authType` to determine authentication method

### Adding Farcaster to Existing SIWE App

```typescript
// Before (SIWE only)
import { useSiweAuth } from "@/hooks/useSiweAuth";

// After (Unified)
import { useAuth } from "@/hooks/useAuth";
const { signInWithSiwe, signInWithFarcaster } = useAuth();
```

## Testing

### SIWE Authentication

1. Connect wallet to application
2. Click "Sign In with Ethereum"
3. Sign SIWE message in wallet
4. Verify authentication status

### Farcaster Authentication

1. Integrate Farcaster SDK in your app
2. Get nonce from `/api/auth/nonce`
3. Use `sdk.actions.signIn()` with nonce
4. Submit result to `/api/auth/farcaster/signin`
5. Verify authentication status

## Error Handling

Common error scenarios:

- **"Invalid nonce/challenge"**: Expired or already used (10-minute limit)
- **"Authentication failed"**: Invalid signature or message
- **"Invalid token"**: JWT verification failed
- **"No FID found"**: Farcaster verification didn't return FID
- **Domain validation errors**: Message domain doesn't match APP_URL

## Components

### AuthButton

Unified authentication button supporting both methods:

```typescript
<AuthButton
  showFarcaster={true}
  onFarcasterSignIn={(params) => console.log("Farcaster signed in")}
  className="custom-styles"
/>
```

### FarcasterAuthExample

Example component showing Farcaster SDK integration:

```typescript
<FarcasterAuthExample className="border rounded-lg p-4" />
```

## Best Practices

1. **Environment Variables**: Always set JWT_SECRET and APP_URL in production
2. **Error Handling**: Implement proper error boundaries and user feedback
3. **Loading States**: Use the `isLoading` state for better UX
4. **Type Guards**: Check `user.authType` before accessing auth-specific fields
5. **SDK Integration**: Properly initialize and manage Farcaster SDK lifecycle
6. **Nonce Management**: Let the system handle nonce generation and consumption
7. **Security**: Validate domains and use HTTPS in production
