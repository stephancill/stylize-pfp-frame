# Share URL Implementation

## Overview

This implementation adds share URL functionality to the Stylize Me application, allowing users to share generated images with a call-to-action to "use this prompt". When users click the CTA, they are redirected to the home page with the prompt pre-populated in the URL parameters.

## Features Implemented

### 1. Share Card Component (`src/components/ShareCard.tsx`)
- **Purpose**: Displays shared generated images in a card format similar to the CreationsGallery
- **Features**:
  - Shows the generated image with overlay toggle for source/result
  - Displays prompt text and creation date
  - Includes a prominent "Use This Prompt" button
  - Responsive design matching the existing UI style

### 2. Enhanced API Endpoint (`src/app/api/images/[id]/route.ts`)
- **Purpose**: Extended existing image API to support JSON format for sharing
- **Features**:
  - Returns raw image data by default (existing behavior)
  - Returns JSON metadata when `?format=json` parameter is used
  - Includes all necessary fields: id, imageDataUrl, promptText, userPfpUrl, createdAt, quoteId

### 3. Share Page (`src/app/generations/[id]/page.tsx`)
- **Purpose**: Replaces the redirect with a proper share page
- **Features**:
  - Fetches image data using React Query
  - Displays ShareCard component with loading and error states
  - Handles missing or unavailable images gracefully
  - Provides fallback link to home page

### 4. Metadata Layout (`src/app/generations/[id]/layout.tsx`)
- **Purpose**: Handles social media metadata for shared links
- **Features**:
  - Generates proper OpenGraph metadata
  - Maintains Farcaster frame compatibility
  - Uses existing opengraph-image endpoint

### 5. URL Parameter Handling (`src/app/page.tsx`)
- **Purpose**: Pre-populates prompts from shared URLs
- **Features**:
  - Reads `prompt` URL parameter on page load
  - Sets custom prompt automatically
  - Shows user-friendly message when prompt is loaded
  - Maintains existing functionality

## User Flow

1. **Sharing**: Users click the share button in CreationsGallery
   - Generates URL: `https://app.com/generations/{imageId}`
   - Can share via Farcaster cast or Twitter

2. **Viewing Shared Content**: 
   - Visitors see a dedicated share page with the image card
   - Page includes image, prompt text, and creation date
   - Prominent "Use This Prompt" button

3. **Using Shared Prompt**:
   - Click button redirects to: `https://app.com/?prompt={encodedPrompt}`
   - Home page automatically loads the prompt
   - User can modify prompt or use as-is
   - Must authenticate to generate new images

## Technical Details

### API Changes
- `GET /api/images/[id]?format=json` returns:
  ```json
  {
    "id": "string",
    "imageDataUrl": "string",
    "promptText": "string | null",
    "userPfpUrl": "string | null", 
    "createdAt": "string",
    "quoteId": "string"
  }
  ```

### URL Parameters
- `/?prompt={text}` - Pre-populates custom prompt field
- Automatically shows notification when prompt is loaded
- URL-encoded to handle special characters

### Error Handling
- Graceful handling of missing images
- Loading states during data fetching
- Fallback UI for unavailable content
- Proper error messages for users

## File Structure

```
src/
├── components/
│   └── ShareCard.tsx           # New share card component
├── app/
│   ├── api/images/[id]/
│   │   └── route.ts           # Enhanced API endpoint
│   ├── generations/[id]/
│   │   ├── layout.tsx         # New metadata layout
│   │   ├── page.tsx           # Updated share page
│   │   └── opengraph-image.tsx # Existing OG image
│   └── page.tsx               # Updated with URL params
```

## Testing

The implementation has been successfully built and compiled. Key areas to test:

1. **Share URL Generation**: Verify share buttons create correct URLs
2. **Share Page Display**: Test image loading and card rendering
3. **Prompt Transfer**: Confirm URL parameters work correctly
4. **Error Handling**: Test with invalid/missing image IDs
5. **Social Sharing**: Verify OpenGraph metadata displays correctly
6. **Mobile Responsiveness**: Test on different screen sizes

## Dependencies

No new dependencies were added. The implementation uses existing:
- React Query for data fetching
- Next.js routing and API routes
- Tailwind CSS for styling
- shadcn/ui components for consistency

## Backward Compatibility

- Existing share URLs continue to work
- Original API endpoints maintain their behavior
- No breaking changes to existing functionality
- Frame metadata preserved for Farcaster integration