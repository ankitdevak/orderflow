import jwt from "jsonwebtoken";

export type UserRole = "CUSTOMER" | "ADMIN";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function generateAccessToken(
  payload: AuthTokenPayload
): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "1h",
  });
}

export function verifyAccessToken(
  token: string
): AuthTokenPayload {
  const decoded = jwt.verify(
    token,
    getJwtSecret()
  );

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "string" ||
    (decoded.role !== "CUSTOMER" &&
      decoded.role !== "ADMIN")
  ) {
    throw new Error("Invalid authentication token");
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
  };
}