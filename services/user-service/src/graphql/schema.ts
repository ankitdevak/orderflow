import { gql } from "graphql-tag";

export const typeDefs = gql`
  enum UserRole {
    CUSTOMER
    ADMIN
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    health: String!
    me: User!
  }

  type Mutation {
    register(
      name: String!
      email: String!
      password: String!
    ): User!

    login(
      email: String!
      password: String!
    ): AuthPayload!
  }
`;