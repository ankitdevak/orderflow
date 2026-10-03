# OrderFlow

OrderFlow is a modular commerce backend built as a set of services. The **User Service** is implemented so far. It is a TypeScript/Node.js GraphQL API built with Express, Apollo Server, Prisma, and PostgreSQL. It supports registration, login, an authenticated `me` query, lookup of a single user, and a user list with filtering, sorting, and cursor pagination.

## Current status

| Area | Status | Notes |
|---|---|---|
| User Service | Implemented | `register`, `login`, `me`, `user(id)`, and `users` (filter, sort, cursor pagination). See [services/user-service/README.md](services/user-service/README.md). |
| PostgreSQL persistence | Implemented | `docker-compose.yml` runs PostgreSQL 16; Prisma migrations live in `services/user-service/prisma`. |
| Product Service | Planned | |
| Order Service | Planned | |
| API Gateway | Planned | `gateway/` is a placeholder. |
| Automated tests | Planned | Type checking only (`npm run typecheck`). |
| Cross-service integration | Planned | |

## Repository layout

```text
orderflow/
  docker-compose.yml      # PostgreSQL 16 for local development
  docs/                   # (empty)
  gateway/                # API gateway (planned)
  services/
    user-service/         # User Service (implemented)
```

## Architecture

The User Service passes each request through these layers:

```mermaid
flowchart TD
    Client[GraphQL client] --> API[Express and Apollo Server]
    API --> Context[Authentication context]
    API --> Resolver[GraphQL resolver]
    Resolver --> Service[User service + Zod validation]
    Service --> Repository[User repository]
    Repository --> Prisma[Prisma Client]
    Prisma --> DB[(PostgreSQL)]
```

The service layer hashes and verifies passwords, issues tokens, validates input, and builds pagination cursors, so the GraphQL resolvers stay thin. The repository layer translates filter, sort, and cursor inputs into Prisma queries.

## User API at a glance

| Operation | Type | Auth | Description |
|---|---|---|---|
| `register(name, email, password)` | Mutation | None | Creates a `CUSTOMER` user and returns `User`. |
| `login(email, password)` | Mutation | None | Returns `{ token, user }`. |
| `me` | Query | Bearer token | Returns the authenticated user. |
| `user(id)` | Query | None (see security notes) | Returns one user by ID. |
| `users(filter, sort, pagination)` | Query | None (see security notes) | Returns `UserConnection { items, pageInfo { hasNextPage, endCursor }, total }`. |
| `health` | Query | None | Returns a health string. |

Example of paginated listing:

```graphql
query {
  users(
    filter: { role: CUSTOMER, name: "ank" }
    sort: { field: NAME, direction: ASC }
    pagination: { first: 10 }
  ) {
    items { id name email role }
    pageInfo { hasNextPage endCursor }
    total
  }
}
```

To get the next page, pass `pagination: { first: 10, after: "<endCursor>" }` with the same `filter` and `sort`. The [User Service README](services/user-service/README.md) documents every operation in full.

Authenticated requests send:

```http
Authorization: Bearer <token>
```

## Technology

- Node.js and TypeScript (ESM)
- Express 5 and Apollo Server 5
- PostgreSQL 16 (Docker) and Prisma 6
- Zod for input validation
- bcrypt for password hashing
- JSON Web Tokens (1-hour expiry, with `userId` and `role` claims; role is `CUSTOMER` or `ADMIN`)

## Local setup

1. Install Node.js and Docker with Docker Compose.
2. Start PostgreSQL from the repository root:

   ```sh
   docker compose up -d
   ```

3. Create `services/user-service/.env`:

   ```env
   PORT=4001
   NODE_ENV=development
   DATABASE_URL="postgresql://orderflow:orderflow@localhost:5432/orderflow?schema=public"
   JWT_SECRET="replace-with-a-long-random-secret"
   ```

4. Install dependencies and apply migrations:

   ```sh
   cd services/user-service
   npm install
   npx prisma migrate dev
   ```

5. Start the service:

   ```sh
   npm run dev
   ```

   GraphQL is served at `http://localhost:4001/graphql` and the health check at `http://localhost:4001/health`.

Do not use the example database credentials or JWT secret in production, and keep real secrets out of source control.

## Commands (User Service)

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | `tsc --noEmit` |

## Security notes

- **`user` and `users` are not protected yet.** Anyone who can reach the API can read every user's name, email, and role. Add authentication and role checks before deploying.
- Only bcrypt password hashes are stored, and they are never exposed through GraphQL.
- Use HTTPS in deployed environments so bearer tokens are not exposed in transit.
- Supply a strong, private `JWT_SECRET` through deployment secrets, and rotate it as needed.
- Enforce authorization in server-side resolvers or services. A role claim alone does not make access safe.
- Validate all external input, and return generic authentication errors that do not reveal whether an account exists.
- Add rate limits to authentication operations.
- Restrict database credentials and network access in production.

## Troubleshooting

| Symptom | Checks |
|---|---|
| Database connection fails | Check that `orderflow-postgres` is running on port 5432 and that `DATABASE_URL` matches the compose credentials. |
| Prisma reports missing tables | Run `npx prisma migrate dev` in `services/user-service`. |
| Login fails with `JWT_SECRET is not configured` | Set `JWT_SECRET` in `services/user-service/.env`. |
| `me` rejects the request | Send `Authorization: Bearer <token>`, check that the token has not expired (1 hour), and confirm the same secret signed it. |
| `users` returns `Invalid cursor` or inconsistent pages | Pass `endCursor` back unchanged, and keep the same `sort` on every page request. |

## Next steps

1. Add authentication and authorization to `user` and `users`.
2. Add automated unit, integration, and API tests.
3. Build the Product Service with its own data model and API.
4. Build the Order Service, and define how it gets user identity and product data.
5. Implement the Gateway and configure routing and authentication boundaries.
6. Add observability, deployment configuration, and production secret management.
