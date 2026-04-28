export interface SessionUser {
    id: string;
    email: string;
    name?: string | null;
    systemRole?: 'admin' | 'project_manager' | null;
}

export interface Session {
    user: SessionUser;
    [key: string]: unknown;
}
