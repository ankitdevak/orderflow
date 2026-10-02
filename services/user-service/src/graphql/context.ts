import type { Request } from "express";

import {
  verifyAccessToken,
  type AuthTokenPayload,
} from "../modules/user/user.auth.js";

export interface GraphQLContext {
  user: AuthTokenPayload | null;
}

export function createContext(
  req: Request
): GraphQLContext {
  const authorization =
    req.headers.authorization;

  if (!authorization) {
    return {
      user: null,
    };
  }

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme !== "Bearer" ||
    !token
  ) {
    return {
      user: null,
    };
  }

  try {
    const user =
      verifyAccessToken(token);

    return {
      user,
    };
  } catch {
    return {
      user: null,
    };
  }
}