# OrderFlow

OrderFlow is a modular commerce backend being built as a set of services. The implementation described in the available project conversation currently covers the **User Service**: a TypeScript/Node.js API using Express, Apollo Server/GraphQL, Prisma, and PostgreSQL, with registration, login, and an authenticated `me` query.

> **Workspace note:** The project checkout was not available when this document was prepared. This README records implementation details present in the referenced conversation; verify filenames, scripts, exact package versions, and configuration against the checkout before treating them as authoritative.

## Current status

| Area | Status | Notes |
|---|---|---|
| User Service | Implemented in the referenced work | Registration, login, JWT-backed authentication, and `me` are described. |
| PostgreSQL persistence | Implemented/configured in the referenced work | Docker PostgreSQL and Prisma are described; exact compose file and migration state could not be inspected. |
| Product Service | Planned | No implementation was available to verify. |
| Order Service | Planned | No implementation was available to verify. |
| API Gateway | Planned | No implementation was available to verify. |
| Automated tests | Planned/unverified | The conversation describes type checking; no test suite could be confirmed. |
| Cross-service integration | Planned | Future integration after the individual services. |

## Architecture

The implemented User Service request path follows this layered design:

```mermaid
flowchart TD
    Client[GraphQL client] --> API[Express and Apollo Server]
    API --> Context[Authentication context]
    API --> Resolver[GraphQL resolver]
    Resolver --> Service[User service]
    Service --> Repository[User repository]
    Repository --> Prisma[Prisma Client]
    Prisma --> DB[(PostgreSQL)]
```

Password hashing/verification and token generation are handled in the service/authentication layer rather than being embedded in GraphQL resolvers. The GraphQL context verifies an incoming bearer token and makes the authenticated identity available to protected operations.

## Implemented User API

The available conversation identifies these operations:

- `register`: validates registration input, hashes the password, and persists a user.
- `login`: verifies the submitted credentials and returns an access token and user details.
- `me`: returns the authenticated user's profile and requires a valid access token.
- A health check endpoint is described; its exact path and response are unverified.

Example registration:

```graphql
mutation Register($name: String!, $email: String!, $password: String!) {
  register(name: $name, email: $email, password: $password) {
    id
    name
    email
  }
}
```

Example login (select fields according to the actual schema):

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

Example authenticated query:

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

Send the token in the HTTP request header:

```http
Authorization: Bearer <access-token>
```

GraphQL names and return shapes above reflect the described design, not a source-verified schema; consult the service SDL before using these snippets verbatim.

## Technology and data

The referenced implementation describes:

- Node.js with TypeScript.
- Express and Apollo Server for the HTTP/GraphQL API.
- PostgreSQL as the relational database, run locally through Docker.
- Prisma for data access and schema migrations.
- Zod for request/input validation.
- bcrypt for password hashing and verification.
- JSON Web Tokens for access authentication.
- A user role union containing `CUSTOMER` and `ADMIN` in the authentication token payload.

The exact Prisma model fields, database constraints, package versions, and compose configuration were not present in the accessible workspace and should be confirmed in source.

## Local setup

The following values and commands were shown or referenced during implementation. Check actual filenames and package scripts in the project checkout before running them.

1. Install a supported Node.js release and Docker with Docker Compose.
2. Start the PostgreSQL container using the repository's compose file (its path and service name are unverified).
3. Configure the User Service environment. The conversation showed this example:

   ```env
   PORT=4001
   NODE_ENV=development
   DATABASE_URL="postgresql://orderflow:orderflow@localhost:5432/orderflow?schema=public"
   JWT_SECRET="replace-with-a-long-random-secret"
   JWT_EXPIRES_IN="1h"
   ```

4. Install dependencies and run the Prisma migration/development commands documented by the service package. Exact script names were not available to verify.
5. Start the service using its development script and use its configured GraphQL endpoint.

Do not use the example database credentials or JWT secret in production. Keep real secrets out of source control.

## Commands

The only exact package command preserved in the available conversation is:

```sh
npm run typecheck
```

It runs `tsc --noEmit` in the User Service. Build, start, migration, and container commands depend on the actual package and compose files and are intentionally not guessed here.

## Security notes

- Store only password hashes; never return or log plaintext passwords.
- Require HTTPS in deployed environments so bearer tokens are not exposed in transit.
- Use a strong, private `JWT_SECRET` supplied through deployment secrets. Rotate it according to operational needs.
- Enforce authorization in server-side resolvers/services; a role claim alone does not grant safe access.
- Validate all external input and return generic authentication errors that do not reveal whether an account exists.
- Set sensible token lifetime and rate limits for authentication operations.
- Restrict database credentials and network access, and use managed secret storage in production.

## Troubleshooting

| Symptom | Checks |
|---|---|
| Database connection fails | Confirm PostgreSQL is running, the port is reachable, and `DATABASE_URL` matches the container credentials/database. |
| Prisma cannot connect or reports missing tables | Check the datasource URL and apply the project's Prisma migrations using its documented scripts. |
| Service refuses to start because JWT configuration is missing | Set `JWT_SECRET`; the described auth helper throws when it is absent. |
| `me` rejects the request | Send `Authorization: Bearer <token>`, verify token signature/expiry, and confirm the service uses the same secret that signed it. |
| TypeScript reports a JWT typing error | The referenced work addressed this by checking the configured secret and validating the decoded payload instead of asserting an unchecked cast. |

## Next steps

1. Confirm and document the actual root scripts, Docker Compose file, Prisma schema, migration commands, and health endpoint.
2. Complete Product Service with its own data model and API.
3. Complete Order Service and define how it obtains user identity and product data.
4. Add automated unit, integration, and API tests.
5. Implement the Gateway and configure routing/authentication boundaries.
6. Add integration workflows, observability, deployment configuration, and production secret management.
