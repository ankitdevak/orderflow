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

  input UserFilterInput {
    id: ID
    name: String
    email: String
    role: UserRole
  }

  enum UserSortField {
    NAME
    EMAIL
    CREATED_AT
    UPDATED_AT
  }

  enum SortDirection {
    ASC
    DESC
  }

  input UserPaginationInput {
    first: Int = 20
    after: String
  }

  type UserPageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type UserConnection {
    items: [User!]!
    pageInfo: UserPageInfo!
    total: Int!
  }

  input UserSortInput {
    field: UserSortField!
    direction: SortDirection!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    health: String!
    me: User!
    user(id: ID!): User!
    users(
      filter: UserFilterInput
      sort: UserSortInput
      pagination: UserPaginationInput
    ): UserConnection!
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