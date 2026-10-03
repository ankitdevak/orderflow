export interface UserPaginationInput {
    first: number;
    after?: string | null;
}

export interface UserPageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

export interface UserConnection<T> {
    items: T[];
    pageInfo: UserPageInfo;
    total: number;
}