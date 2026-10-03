import { prisma } from "../../config/database.js";
import type { UserFilterInput, UserSortInput } from "./user.schema.js";
import {
  UserCursor,
  decodeCursor,
} from "./user.cursor.js";

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findMany(
    filter: UserFilterInput,
    sort: UserSortInput,
    first: number,
    after?: string | null
  ) {
    const cursor = after
      ? decodeCursor(after)
      : null;

    const where = {
      ...(filter.id && {
        id: filter.id,
      }),

      ...(filter.email && {
        email: filter.email,
      }),

      ...(filter.role && {
        role: filter.role,
      }),

      ...(filter.name && {
        name: {
          contains: filter.name,
          mode: "insensitive" as const,
        },
      }),
    };

    const orderBy = this.getOrderBy(sort);

    const cursorWhere = cursor
      ? this.getCursorWhere(cursor)
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          ...where,
          ...cursorWhere,
        },
        orderBy,
        take: first + 1,
      }),

      prisma.user.count({
        where,
      }),
    ]);

    const hasNextPage = items.length > first;

    const pageItems = hasNextPage
      ? items.slice(0, first)
      : items;

    return {
      items: pageItems,
      total,
      hasNextPage,
    };
  }

  private getOrderBy(sort: UserSortInput) {
    const direction =
      sort.direction.toLowerCase() as
      | "asc"
      | "desc";

    switch (sort.field) {
      case "NAME":
        return [
          { name: direction },
          { id: direction },
        ];

      case "EMAIL":
        return [
          { email: direction },
          { id: direction },
        ];

      case "UPDATED_AT":
        return [
          { updatedAt: direction },
          { id: direction },
        ];

      case "CREATED_AT":
      default:
        return [
          { createdAt: direction },
          { id: direction },
        ];
    }
  }

  private getCursorWhere(cursor: UserCursor) {
    const isAscending = cursor.direction === "ASC";

    switch (cursor.field) {
      case "CREATED_AT":
        return isAscending
          ? {
            OR: [
              {
                createdAt: {
                  gt: new Date(cursor.value),
                },
              },
              {
                createdAt: new Date(cursor.value),
                id: {
                  gt: cursor.id,
                },
              },
            ],
          }
          : {
            OR: [
              {
                createdAt: {
                  lt: new Date(cursor.value),
                },
              },
              {
                createdAt: new Date(cursor.value),
                id: {
                  lt: cursor.id,
                },
              },
            ],
          };

      case "UPDATED_AT":
        return isAscending
          ? {
            OR: [
              {
                updatedAt: {
                  gt: new Date(cursor.value),
                },
              },
              {
                updatedAt: new Date(cursor.value),
                id: {
                  gt: cursor.id,
                },
              },
            ],
          }
          : {
            OR: [
              {
                updatedAt: {
                  lt: new Date(cursor.value),
                },
              },
              {
                updatedAt: new Date(cursor.value),
                id: {
                  lt: cursor.id,
                },
              },
            ],
          };

      case "NAME":
        return isAscending
          ? {
            OR: [
              {
                name: {
                  gt: cursor.value,
                },
              },
              {
                name: cursor.value,
                id: {
                  gt: cursor.id,
                },
              },
            ],
          }
          : {
            OR: [
              {
                name: {
                  lt: cursor.value,
                },
              },
              {
                name: cursor.value,
                id: {
                  lt: cursor.id,
                },
              },
            ],
          };

      case "EMAIL":
        return isAscending
          ? {
            OR: [
              {
                email: {
                  gt: cursor.value,
                },
              },
              {
                email: cursor.value,
                id: {
                  gt: cursor.id,
                },
              },
            ],
          }
          : {
            OR: [
              {
                email: {
                  lt: cursor.value,
                },
              },
              {
                email: cursor.value,
                id: {
                  lt: cursor.id,
                },
              },
            ],
          };
    }
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    return prisma.user.create({
      data,
    });
  }
}