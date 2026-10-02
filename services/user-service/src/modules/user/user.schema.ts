import { z } from "zod";

export const registerUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(100, "Password must not exceed 100 characters"),
});

export type RegisterUserInput = z.infer<
  typeof registerUserSchema
>;