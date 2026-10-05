# RentIt Backend Service

Express.js REST API with Prisma ORM, PostgreSQL database, JWT authentication, and concurrency-safe rental scheduling.

## Production Database Migrations

In production, never use `prisma db push`. Always run:

```bash
npx prisma generate
npx prisma migrate deploy
```

- `prisma generate`: Builds the Prisma Client for your target host architecture.
- `prisma migrate deploy`: Applies pending migrations from `prisma/migrations` in deterministic, chronological order.

## Environment Variables

Configure `.env` using `.env.example` as a template:

- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/rentit`)
- `JWT_ACCESS_SECRET`: Strong secret for access tokens
- `JWT_REFRESH_SECRET`: Strong secret for refresh tokens
- `CLIENT_ORIGIN`: Allowed origins for CORS (supports comma-separated list, e.g. `http://localhost:5173,https://rentit.app`)
- `PORT`: Port number (default: `5000`)
- `NODE_ENV`: `development` or `production`

In `production` mode, the server enforces fail-fast checks requiring all critical security variables to be set.
