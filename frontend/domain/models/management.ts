export type AccountRole = 'admin' | 'professional';

export interface AuthenticatedUser {
    token: string;
    email: string;
    name: string;
    role: AccountRole;
    mustChangePassword: boolean;
}

export interface Professional {
    name: string;
    document: string;
    email: string;
    phone: string;
    active: boolean;
    accountLinked: boolean;
    hasProfile: boolean;
}

export interface UserAccount {
    name: string;
    email: string;
    role: AccountRole;
    active: boolean;
}
