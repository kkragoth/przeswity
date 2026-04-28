export interface SessionUser {
    id: string;
    email: string;
    name?: string | null;
    isAdmin?: boolean;
    isCoordinator?: boolean;
}

export interface Session {
    user: SessionUser;
    [key: string]: unknown;
}
