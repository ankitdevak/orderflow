import { UserRepository } from "../modules/user/user.repository.js";
import { UserService } from "../modules/user/user.service.js";
import type { GraphQLContext } from "./context.js";

const userRepository = new UserRepository();
const userService = new UserService(userRepository);

export const resolvers = {
  Query: {
    health: () => "User service GraphQL is healthy",

    me: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const user = await userRepository.findById(
        context.user.userId
      );

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    },
  },

  Mutation: {
    register: async (
      _parent: unknown,
      args: {
        name: string;
        email: string;
        password: string;
      }
    ) => {
      return userService.register({
        name: args.name,
        email: args.email,
        password: args.password,
      });
    },

    login: async (
      _parent: unknown,
      args: {
        email: string;
        password: string;
      }
    ) => {
      return userService.login(
        args.email,
        args.password
      );
    },
  },
};