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

export const userFilterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(["CUSTOMER", "ADMIN"]).optional(),
});

export type UserFilterInput = z.infer<
  typeof userFilterSchema
>;

export const userSortSchema = z.object({
  field: z.enum([
    "NAME",
    "EMAIL",
    "CREATED_AT",
    "UPDATED_AT",
  ]),
  direction: z.enum(["ASC", "DESC"]),
});

export type UserSortInput = z.infer<
  typeof userSortSchema
>;

export const userPaginationSchema = z.object({
  first: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  after: z
    .string()
    .nullable()
    .optional(),
});

export type UserPaginationInput = z.infer<
  typeof userPaginationSchema
>;