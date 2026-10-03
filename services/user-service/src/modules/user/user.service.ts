import bcrypt from "bcrypt";

import { UserRepository } from "./user.repository.js";
import {
  registerUserSchema,
  type RegisterUserInput,
  userFilterSchema,
  type UserFilterInput,
  userSortSchema,
  type UserSortInput,
  userPaginationSchema,
  type UserPaginationInput
} from "./user.schema.js";
import { generateAccessToken } from "./user.auth.js";
import { encodeCursor } from "./user.cursor.js";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository
  ) { }

  async register(input: RegisterUserInput) {
    const validatedInput =
      registerUserSchema.parse(input);

    const normalizedEmail =
      validatedInput.email.toLowerCase();

    const existingUser =
      await this.userRepository.findByEmail(
        normalizedEmail
      );

    if (existingUser) {
      throw new Error(
        "User with this email already exists"
      );
    }

    const passwordHash = await bcrypt.hash(
      validatedInput.password,
      12
    );

    return this.userRepository.create({
      name: validatedInput.name,
      email: normalizedEmail,
      passwordHash,
    });
  }

  async login(
    email: string,
    password: string
  ) {
    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await this.userRepository.findByEmail(
        normalizedEmail
      );

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordMatches) {
      throw new Error("Invalid email or password");
    }

    const token = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    return {
      token,
      user,
    };
  }

  async getById(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async getMany(
    filter: UserFilterInput = {},
    sort?: UserSortInput,
    pagination?: UserPaginationInput
  ) {
    const validatedFilter =
      userFilterSchema.parse(filter);

    const validatedSort = sort
      ? userSortSchema.parse(sort)
      : {
        field: "CREATED_AT" as const,
        direction: "DESC" as const,
      };

    const validatedPagination =
      userPaginationSchema.parse(
        pagination ?? {}
      );

    const result =
      await this.userRepository.findMany(
        validatedFilter,
        validatedSort,
        validatedPagination.first,
        validatedPagination.after
      );

    const lastUser =
      result.items[result.items.length - 1];

    const endCursor = lastUser
      ? encodeCursor({
        field: validatedSort.field,
        direction: validatedSort.direction,
        value: this.getCursorValue(
          lastUser,
          validatedSort.field
        ),
        id: lastUser.id,
      })
      : null;

    return {
      items: result.items,
      total: result.total,

      pageInfo: {
        hasNextPage: result.hasNextPage,
        endCursor,
      },
    };
  }

  private getCursorValue(
    user: {
      name: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    },
    field: UserSortInput["field"]
  ): string {
    switch (field) {
      case "NAME":
        return user.name;

      case "EMAIL":
        return user.email;

      case "UPDATED_AT":
        return user.updatedAt.toISOString();

      case "CREATED_AT":
        return user.createdAt.toISOString();
    }
  }
}