export type UserSortField =
    | "NAME"
    | "EMAIL"
    | "CREATED_AT"
    | "UPDATED_AT";

export type SortDirection = "ASC" | "DESC";

export interface UserCursor {
    field: UserSortField;
    direction: SortDirection;
    value: string;
    id: string;
}

export function encodeCursor(
    cursor: UserCursor
): string {
    return Buffer.from(
        JSON.stringify(cursor),
        "utf8"
    ).toString("base64url");
}

export function decodeCursor(
    encodedCursor: string
): UserCursor {
    try {
        const decoded = Buffer.from(
            encodedCursor,
            "base64url"
        ).toString("utf8");

        const cursor = JSON.parse(decoded) as UserCursor;

        if (
            !cursor.field ||
            !cursor.direction ||
            !cursor.value ||
            !cursor.id
        ) {
            throw new Error("Invalid cursor");
        }

        return cursor;
    } catch {
        throw new Error("Invalid cursor");
    }
}