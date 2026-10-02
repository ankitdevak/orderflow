import bcrypt from "bcrypt";

import { UserRepository } from "./user.repository.js";
import {
  registerUserSchema,
  type RegisterUserInput,
} from "./user.schema.js";
import { generateAccessToken } from "./user.auth.js";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

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
}