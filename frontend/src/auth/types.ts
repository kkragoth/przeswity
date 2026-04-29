export enum SystemRole {
    Admin = 'admin',
    ProjectManager = 'project_manager',
}

export interface SessionUser {
    id: string;
    email: string;
    name?: string | null;
    systemRole?: SystemRole | null;
}

export interface Session {
    user: SessionUser;
    [key: string]: unknown;
}
