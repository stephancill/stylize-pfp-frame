# SIWE (Sign-In With Ethereum) Authentication System

A comprehensive authentication system built for desktop applications using **viem's built-in SIWE utilities**, stateless JWT cookies, and Redis-based nonce management.

## Overview

This system provides secure Ethereum-based authentication using:

- **Viem's SIWE utilities** for EIP-4361 message creation and validation
- Stateless JWT tokens stored in HTTP-only cookies
- Redis-based nonce management with automatic expiry
- Anti-replay protection with single-use nonces
- Complete React integration with loading states

## Dependencies

The system uses these core dependencies:

- `viem` - For SIWE message creation, validation, and signature verification
- `wagmi` - For React Ethereum integration
- `jsonwebtoken` - For JWT creation and verification
- `redis` - For nonce storage and management

## Key Features

- **Secure Authentication**: Uses EIP-4361 standard SIWE messages with viem's utilities
- **Stateless Design**: JWT tokens contain all necessary user information
- **Nonce Management**: Redis-based nonce storage with 10-minute expiry
- **Anti-Replay Protection**: Single-use nonces prevent replay attacks
- **Production Ready**: HTTP-only cookies with secure flags in production
- **React Integration**: Complete hooks and components for frontend

## Architecture

### Backend Components

- `src/lib/siwe-auth.ts` - Core authentication utilities using viem
- `src/app/api/auth/nonce/route.ts` - Nonce generation endpoint
- `src/app/api/auth/signin/route.ts` - Authentication endpoint
- `src/app/api/auth/signout/route.ts` - Sign out endpoint
- `src/app/api/auth/me/route.ts` - Current user endpoint

### Frontend Components

- `src/hooks/useSiweAuth.ts` - React authentication hook
- `src/components/SiweAuthButton.tsx` - Sign in/out component

## Usage Examples

### Protecting API Routes

```typescript
import { withSiweAuth, SiweUserRouteHandler } from "@/lib/siwe-auth";

const handler: SiweUserRouteHandler<{
  params: Promise<{ fid: string }>;
}> = async (req, user, { params }) => {
  const { fid } = await params;

  // Access authenticated user
  console.log("Authenticated address:", user.address);

  // Your protected logic here
  return NextResponse.json({ message: "Success", user });
};

export const GET = withSiweAuth(handler);
```

### Frontend Authentication

```typescript
import { useSiweAuth } from "@/hooks/useSiweAuth";

function MyComponent() {
  const { isAuthenticated, user, signIn, signOut, isLoading } = useSiweAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <button onClick={signIn}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.address}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Sign In/Out Component

```typescript
import { SiweAuthButton } from "@/components/SiweAuthButton";

function App() {
  return (
    <div>
      <SiweAuthButton />
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# JWT Secret (required)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Redis Configuration (required)
REDIS_URL=redis://localhost:6379

# Optional: Custom cookie name
SIWE_JWT_COOKIE_NAME=siwe-auth

# Optional: JWT expiration (default: 7d)
SIWE_JWT_EXPIRES_IN=7d
```

### Constants

Key configuration values in `src/lib/constants.ts`:

```typescript
// Nonce expires after 10 minutes
export const SIWE_NONCE_EXPIRY_SECONDS = 10 * 60;

// Redis key prefix for nonces
export const SIWE_NONCE_REDIS_PREFIX = "siwe:nonce:";

// JWT cookie configuration
export const SIWE_JWT_COOKIE_NAME = "siwe-auth";
export const SIWE_JWT_EXPIRES_IN = "7d";
```

## Security Features

### Nonce Management

- Generated using viem's `generateSiweNonce()` for cryptographic randomness
- Stored in Redis with 10-minute expiry
- Single-use only (deleted immediately after validation)
- Prevents replay attacks

### JWT Security

- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production
- SameSite=Strict prevents CSRF
- 7-day expiration with server-side validation

### Message Validation

- Uses viem's `validateSiweMessage()` for structure validation
- Signature verification with viem's `verifyMessage()`
- Domain and URI validation
- Timestamp validation for message freshness

## Technical Details

### Message Flow

1. **Nonce Generation**: Client requests nonce from `/api/auth/nonce`
2. **Message Creation**: Client creates SIWE message using viem's `createSiweMessage()`
3. **User Signature**: User signs message with their wallet
4. **Server Verification**: Server validates using viem's utilities and consumes nonce
5. **JWT Creation**: Server creates JWT and sets HTTP-only cookie
6. **Subsequent Requests**: JWT validates user identity

### Error Handling

The system includes comprehensive error handling:

- Invalid signatures
- Expired or invalid nonces
- Malformed SIWE messages
- JWT validation errors
- Network failures

### TypeScript Support

Full TypeScript support with proper type definitions:

- `SiweAuthUser` interface for user data
- `AuthState` interface for React state
- `SiweUserRouteHandler` type for protected routes

## Migration Notes

This system has been migrated from the standalone `siwe` package to viem's built-in SIWE utilities:

- Uses `createSiweMessage` instead of `new SiweMessage()`
- Uses `validateSiweMessage` and `parseSiweMessage` for validation
- Uses `generateSiweNonce` for nonce generation
- Uses `verifyMessage` for signature verification

## Testing

The system can be tested by:

1. Connecting a wallet to the application
2. Clicking the sign-in button
3. Signing the SIWE message in your wallet
4. Verifying authentication status
5. Testing protected routes

## Troubleshooting

Common issues:

- **"Invalid nonce"**: Nonce may be expired (10-minute limit) or already used
- **"Authentication failed"**: Check wallet connection and signature
- **JWT errors**: Verify JWT_SECRET environment variable
- **Redis errors**: Ensure Redis is running and accessible
