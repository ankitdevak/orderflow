# User Service

The User Service is OrderFlow's identity and account component. It exposes a GraphQL API for registration, login, retrieving the authenticated user, looking up a user by ID, and listing users with filtering, sorting, and cursor-based pagination.

Stack: Node.js, TypeScript, Express 5, Apollo Server 5, Prisma 6, PostgreSQL 16, Zod, bcrypt, and JSON Web Tokens.

## Status

| Capability | Status |
|---|---|
| Register user | Implemented |
| Login and issue access token | Implemented |
| JWT authentication context | Implemented |
| Protected `me` query | Implemented |
| `user(id)` lookup | Implemented |
| `users` list with filter, sort, and cursor pagination | Implemented |
| PostgreSQL/Prisma persistence | Implemented (`create_user` migration) |
| Authorization on `user` / `users` | Not yet implemented, see [Security](#security-and-operational-guidance) |
| Tests | Planned |
| Product/Order integration | Planned |

## Request flow

```mermaid
sequenceDiagram
    participant C as Client
    participant G as GraphQL API
    participant X as Auth context
    participant R as Resolver
    participant S as User service
    participant P as User repository
    participant D as PostgreSQL
    C->>G: GraphQL operation + optional Bearer token
    G->>X: Build request context
    X->>X: Verify JWT when supplied
    G->>R: Dispatch operation
    R->>S: Validate input (Zod) and run business logic
    S->>P: Read or write user data
    P->>D: SQL via Prisma
    D-->>C: Selected GraphQL result
```

Registration hashes the password before it is stored. Login compares the submitted password with the stored hash and issues a signed access token. The request context (`src/graphql/context.ts`) reads `Authorization: Bearer <token>`. If the token is valid, it exposes `{ userId, role }` as `context.user`. If the token is missing or invalid, `context.user` is `null`.

## Endpoints

| Path | Description |
|---|---|
| `POST /graphql` | GraphQL API (Apollo Server) |
| `GET /health` | HTTP health check, returns `{ "service": "user-service", "status": "ok" }` |

The default port is `4001`.

## API operations

### Register

```graphql
mutation Register($name: String!, $email: String!, $password: String!) {
  register(name: $name, email: $email, password: $password) {
    id
    name
    email
    role
  }
}
```

Validation rules: `name` must be 2–100 characters (trimmed), `email` must be a valid email address, and `password` must be 8–100 characters. New users get the `CUSTOMER` role.

### Login

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      name
      email
      role
    }
  }
}
```

Tokens carry `userId` and `role` (`CUSTOMER` or `ADMIN`) and expire after **1 hour**. The expiry is hard-coded in `user.auth.ts`, which does not read `JWT_EXPIRES_IN`.

### Current user

```graphql
query Me {
  me {
    id
    name
    email
    role
  }
}
```

This query requires the header:

```http
Authorization: Bearer <token>
```

Without a valid token, it returns the error `Authentication required`.

### User by ID

```graphql
query User($id: ID!) {
  user(id: $id) {
    id
    name
    email
    role
    createdAt
  }
}
```

Returns the error `User not found` if no user has that ID.

### List users

```graphql
query Users(
  $filter: UserFilterInput
  $sort: UserSortInput
  $pagination: UserPaginationInput
) {
  users(filter: $filter, sort: $sort, pagination: $pagination) {
    items {
      id
      name
      email
      role
      createdAt
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    total
  }
}
```

Example variables:

```json
{
  "filter": { "role": "CUSTOMER", "name": "ank" },
  "sort": { "field": "NAME", "direction": "ASC" },
  "pagination": { "first": 10 }
}
```

**Filter** (`UserFilterInput`). All fields are optional and are combined with AND.

| Field | Match |
|---|---|
| `id` | Exact match; must be a UUID |
| `email` | Exact match; must be a valid email address |
| `role` | `CUSTOMER` or `ADMIN` |
| `name` | Case-insensitive substring match |

**Sort** (`UserSortInput`)

- `field`: `NAME`, `EMAIL`, `CREATED_AT`, or `UPDATED_AT`
- `direction`: `ASC` or `DESC`
- Default: `CREATED_AT DESC`
- `id` is always added as a secondary sort key, so rows with equal sort values keep a stable order across pages.

**Pagination** (`UserPaginationInput`)

- `first`: page size, from 1 to 100 (default 20)
- `after`: the `endCursor` from the previous page

Pagination uses keysets (cursors), not offsets. A cursor is an opaque base64url string that encodes the sort field, the direction, the last item's sort value, and its `id`. To get the next page, send the same `filter` and `sort` with `after: <endCursor>`, and keep going while `pageInfo.hasNextPage` is `true`. `total` counts every user that matches the filter, ignoring the cursor. If a cursor is malformed, the query fails with `Invalid cursor`.

> If you change `sort`, start again from the first page. A cursor only works with the sort that produced it.

## Configuration

Create `services/user-service/.env`:

```env
PORT=4001
NODE_ENV=development
DATABASE_URL="postgresql://orderflow:orderflow@localhost:5432/orderflow?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
```

If `JWT_SECRET` is not set, login and token verification throw. Outside development, use a unique, high-entropy secret supplied through a secret manager. Do not commit a populated `.env` file.

## PostgreSQL and Prisma

The repository root contains `docker-compose.yml`, which runs a `postgres:16` container named `orderflow-postgres` on port `5432`. Its user, password, and database are all `orderflow`.

```sh
# from the repository root
docker compose up -d

# from services/user-service
npm install
npx prisma migrate dev
```

The Prisma schema is in `prisma/schema.prisma`. The `User` model maps to the `users` table and has these fields: `id` (UUID), `name`, `email` (unique), `passwordHash`, `role` (default `CUSTOMER`), `createdAt`, and `updatedAt`.

## Project structure

```text
services/user-service/
  prisma/
    schema.prisma
    migrations/
  src/
    app.ts                  # Express app, /health, /graphql
    server.ts               # bootstrap, DB connect, graceful shutdown
    config/
      database.ts           # Prisma client and connect/disconnect
    graphql/
      schema.ts             # GraphQL SDL
      resolvers.ts          # Query/Mutation resolvers
      context.ts            # Bearer token -> context.user
    modules/user/
      user.auth.ts          # JWT sign/verify
      user.service.ts       # business logic (register, login, getById, getMany)
      user.repository.ts    # Prisma access, filtering, sorting, keyset pagination
      user.schema.ts        # Zod schemas: register, filter, sort, pagination
      user.cursor.ts        # cursor encode/decode
      user.pagination.ts    # pagination/connection types
```

## Commands

Run these from `services/user-service`:

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload (`tsx watch src/server.ts`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`node dist/server.js`) |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |

## Security and operational guidance

- **`user` and `users` do not check authentication or authorization yet.** Anyone who can reach the endpoint can read every user's name, email, and role. Add auth checks before exposing these queries; `users` is a likely candidate for `ADMIN`-only access.
- Passwords are hashed with bcrypt. `passwordHash` is not part of the GraphQL `User` type.
- Decoded JWT claims are checked (`userId` must be a string, and `role` must be a known value) before they are used.
- JWT claims prove identity. They do not replace authorization checks on each protected action.
- Use HTTPS, and keep bearer tokens out of logs and insecure browser storage.
- Add rate limits and generic failure messages for login and registration.
- Make sure Prisma errors and database internals are never returned to clients.

## Troubleshooting

| Issue | What to check |
|---|---|
| Login fails with `JWT_SECRET is not configured` | Set `JWT_SECRET` in `.env`. |
| `me` returns `Authentication required` | Check the `Authorization: Bearer <token>` header, whether the token has expired (1 hour), and that the same `JWT_SECRET` signed it. |
| `users` returns `Invalid cursor` | Pass the `endCursor` from a previous response unchanged. |
| `users` pages skip or repeat items | Send the same `sort` with every page request, and start over if you change it. |
| Validation error on `users` input | `filter.id` must be a UUID, `filter.email` must be a valid email, and `first` must be between 1 and 100. |
| PostgreSQL connection error | Check that `orderflow-postgres` is running and that `DATABASE_URL` matches the compose credentials. |
| Missing relation/table | Run `npx prisma migrate dev`. |

## Next steps

1. Add authentication and role-based authorization to `user` and `users`.
2. Reject cursors whose sort field or direction does not match the current `sort`.
3. Add tests for registration, login, JWT validation, `me`, filtering, sorting, and pagination across pages.
4. Read the token lifetime from configuration instead of hard-coding it.
5. Integrate with the planned Order Service and Gateway.
