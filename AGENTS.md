# Project Agents.md Guide

This Agents.md file provides comprehensive guidance for AI agents working with this codebase.

## Project Structure

- `/src`: Main source code directory
  - `/app`: Next.js application routes and pages
  - `/components`: Reusable React components (including shadcn/ui components)
  - `/lib`: Utility functions and shared logic
  - `/migrations`: Database migration files
  - `/providers`: React context providers
  - `/scripts`: Utility scripts
  - `/types`: TypeScript type definitions
  - `/workers`: BullMQ worker implementations
- `/public`: Static assets
- `/migrations`: Database migration files

## Technology Stack

- Next.js for the frontend framework
- TypeScript for type safety
- shadcn/ui for UI components
- Tailwind CSS for styling
- PNPM for package management
- BullMQ for job queues and background processing
- Docker for containerization

## Package Management

- Use PNPM as the package manager
- Commands:

  ```bash
  # Install dependencies
  pnpm install

  # Add a new dependency
  pnpm add <package-name>

  # Add a dev dependency
  pnpm add -D <package-name>

  # Run scripts
  pnpm run <script-name>
  ```

## Coding Conventions

### General Guidelines

- Use TypeScript for all new code
- Follow the existing code style in each file
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Use async/await for asynchronous operations

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper prop typing
- Follow the file naming convention: PascalCase.tsx
- Place components in appropriate directories based on their scope
- Use shadcn/ui components when available
- Follow shadcn/ui theming guidelines

### Styling

- Use Tailwind CSS for styling
- Follow utility-first approach
- Use shadcn/ui components as the base UI layer
- Customize shadcn/ui components using Tailwind
- Use custom CSS only when necessary
- Maintain consistent spacing and layout

### TypeScript

- Define proper types for all variables and functions
- Use interfaces for object shapes
- Avoid using `any` type
- Use type guards when necessary
- Keep type definitions in the `/types` directory
- Use strict TypeScript configuration

### BullMQ Workers

- Keep worker implementations in `/src/workers`
- Use proper typing for job data
- Implement error handling and retries
- Use appropriate queue configurations
- Document job payload types
- Follow BullMQ best practices for job processing

## Testing Requirements

Run tests with the following commands:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- path/to/test-file.test.ts

# Run tests with coverage
pnpm test -- --coverage
```

## Pull Request Guidelines

When creating a PR, ensure it:

1. Includes a clear description of the changes
2. References any related issues
3. Ensures all tests pass
4. Includes screenshots for UI changes
5. Keeps PRs focused on a single concern

## Programmatic Checks

Before submitting changes, run:

```bash
# Lint check
pnpm lint

# Build check
pnpm build
```

All checks must pass before code can be merged.

## Environment Setup

1. Use PNPM as the package manager
2. Install dependencies with `pnpm install`
3. Set up environment variables in `.env` file
4. Use Docker Compose for local development
5. Configure BullMQ connection settings

## Database Migrations

- Keep migrations in the `/migrations` directory
- Follow the naming convention: `YYYYMMDD_description.sql`
- Test migrations locally before committing
- Include both up and down migrations

## API Guidelines

- Use RESTful principles for API design
- Document all API endpoints
- Include proper error handling
- Use appropriate HTTP status codes
- Validate input data

## Security Guidelines

- Never commit sensitive data
- Use environment variables for secrets
- Implement proper authentication
- Validate all user input
- Follow security best practices

## Performance Guidelines

- Optimize images and assets
- Implement proper caching
- Use code splitting
- Monitor bundle sizes
- Implement lazy loading where appropriate
- Use BullMQ for heavy background tasks

## Documentation

- Keep documentation up to date
- Document complex logic
- Include examples where helpful
- Use JSDoc comments for functions
- Maintain a clear README.md

## Deployment

- Follow CI/CD pipeline guidelines
- Test thoroughly before deployment
- Monitor application after deployment
- Have a rollback plan
- Document deployment procedures
- Ensure BullMQ workers are properly configured
