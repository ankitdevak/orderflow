# User Service

The User Service is the implemented identity/account component described for OrderFlow. It provides a GraphQL API for registration, login, and retrieving the currently authenticated user. The described stack is Node.js, TypeScript, Express, Apollo Server, Prisma, PostgreSQL, Zod, bcrypt, and JWT.

> **Workspace note:** The service checkout was not available when this file was prepared. The architecture and behavior below come from the referenced conversation. Confirm exact source filenames, schema fields, package scripts, and response types in the project before relying on them as a source of truth.

## Status

| Capability | Status |
|---|---|
| Register user | Implemented in the referenced work |
| Login and issue access token | Implemented in the referenced work |
| JWT authentication context | Implemented in the referenced work |
| Protected `me` query | Implemented in the referenced work |
| PostgreSQL/Prisma persistence | Described as configured; migration files could not be inspected |
| Tests | Planned/unverified |
| Product/Order integration | Planned |

Product Service, Order Service, Gateway, automated tests, and future cross-service integration should be treated as planned unless confirmed in the checkout.

## Request flow

```mermaid
sequenceDiagram
    participant C as Client
    participant G as GraphQL API
    participant X as Auth context
    participant R as Resolver
    participant S as User service
    participant P as Prisma/repository
    participant D as PostgreSQL
    C->>G: GraphQL operation + optional Bearer token
    G->>X: Build request context
    X->>X: Verify JWT when supplied
    G->>R: Dispatch operation
    R->>S: Validate/use business operation
    S->>P: Read or write user data
    P->>D: SQL via Prisma
    D-->>C: Selected GraphQL result
```

Registration hashes the password before persistence. Login checks the submitted password against the stored hash and issues a signed access token. For `me`, the request context verifies the token and exposes the authenticated user identity to the resolver/service.

## API operations

The referenced implementation describes `register`, `login`, and `me`. These examples use likely argument and return names; validate them against the checked-out GraphQL schema.

### Register

```graphql
mutation Register($name: String!, $email: String!, $password: String!) {
  register(name: $name, email: $email, password: $password) {
    id
    name
    email
  }
}
```

The registration path validates input with Zod, hashes the password with bcrypt, and stores the user through the repository/Prisma layer. The exact password policy, duplicate-email behavior, and selected fields require source verification.

### Login

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    accessToken
    user {
      id
      name
      email
    }
  }
}
```

The conversation describes a one-hour token lifetime in the JWT helper. It also shows a `JWT_EXPIRES_IN` environment value, but the helper shown uses a literal `"1h"`; verify whether the current source actually reads the environment variable.

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

Include the access token as an HTTP header:

```http
Authorization: Bearer <access-token>
```

The described token claims contain `userId` and a role of `CUSTOMER` or `ADMIN`. The `me` field is intended to require authentication. Exact GraphQL schema types and error behavior are unverified.

## Configuration

The referenced conversation provided this development example:

```env
PORT=4001
NODE_ENV=development
DATABASE_URL="postgresql://orderflow:orderflow@localhost:5432/orderflow?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1h"
```

Use a unique, high-entropy secret outside development and supply it via a secret manager or protected environment configuration. Do not commit a populated `.env` file. Confirm whether all listed variables are consumed by the current service code.

## PostgreSQL and Prisma

The service is described as using a Docker PostgreSQL database and Prisma. The example URL targets a database named `orderflow` on `localhost:5432`, with user/password `orderflow`. The actual Compose filename, container/service name, Prisma schema path, generated-client command, and migration scripts were not available for inspection.

Use the repository's documented Compose configuration to start the database, then apply migrations using the scripts defined in the service's `package.json`. Do not assume a particular migration command until the package scripts have been checked.

## Project structure

The conversation references a modular user implementation with these source modules:

```text
src/
  modules/
    user/
      user.auth.ts        # JWT generation and verification
      user.service.ts     # registration/login business logic
      user.repository.ts  # persistence access
      user.schema.ts      # registration validation/types
```

It also describes GraphQL schema/resolvers, an authentication context, application/server setup, and Prisma configuration. Their exact paths and filenames could not be confirmed, so this is a conceptual outline, not a verified complete tree.

## Commands

The exact command captured in the referenced work is:

```sh
npm run typecheck
```

This runs `tsc --noEmit`. The development, build, start, migration, and database commands are package-specific and should be read from the current `package.json` and repository Compose file.

## Security and operational guidance

- Hash passwords with the configured password-hashing library and never expose hashes in GraphQL selections or logs.
- Validate decoded JWT claims before using them. The implementation discussion specifically corrected an unchecked payload cast by validating `userId` and the role claim.
- Treat JWT claims as identity information, not a replacement for authorization checks on each protected action.
- Use HTTPS and protect bearer tokens from browser storage/logging exposure.
- Keep production secrets out of Git and rotate compromised secrets.
- Apply rate limits and generic failure messages to login/registration as appropriate.
- Ensure Prisma errors and database internals are not returned to clients.

## Troubleshooting

| Issue | What to check |
|---|---|
| Startup fails due to missing JWT secret | Configure `JWT_SECRET`; the described helper throws if the value is missing. |
| `me` returns an authentication error | Check the Bearer header, token expiration, signing secret, and context verification path. |
| PostgreSQL connection error | Check the database container, port, credentials, database name, and `DATABASE_URL`. |
| Missing relation/table | Apply the project's Prisma migrations and confirm the correct schema/database. |
| TypeScript JWT overload error | Ensure the secret is narrowed to a definite string and decoded claims are validated before constructing the typed payload. |
| GraphQL field/argument validation error | Compare the operation with the actual SDL; examples here were reconstructed without the service files. |

## Next steps

1. Verify this documentation against `package.json`, Prisma schema/migrations, SDL, resolvers, auth context, and Docker configuration.
2. Add tests for registration validation, password hashing, login failure/success, JWT claim validation, and authenticated `me` behavior.
3. Add explicit authorization rules for role-sensitive operations.
4. Integrate the User Service with the planned Order Service and Gateway, with clear token-verification and service-to-service boundaries.
