export type AccountRole = 'admin' | 'professional';

export interface AuthenticatedUser {
    token: string;
    email: string;
    name: string;
    role: AccountRole;
}

export interface Professional {
    name: string;
    document: string;
    email: string;
    phone: string;
    active: boolean;
}

export interface UserAccount {
    name: string;
    email: string;
    role: AccountRole;
    active: boolean;
}
