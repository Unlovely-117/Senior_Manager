export type AccountRole = 'admin' | 'professional';

export interface AuthenticatedUser {
    token: string;
    email: string;
    name: string;
    role: AccountRole;
    mustChangePassword: boolean;
}

export interface Professional {
    id: string | null;
    accountId: string | null;
    name: string;
    document: string;
    email: string;
    phone: string;
    active: boolean;
    accountActive: boolean | null;
    profileActive: boolean | null;
    accountLinked: boolean;
    hasProfile: boolean;
    specialty?: string;
    licenseNumber?: string;
    education?: string;
    experience?: string;
    biography?: string;
    verificationStatus?: 'SIN_PRESENTAR' | 'PENDIENTE' | 'VERIFICADA' | 'REQUIERE_CAMBIOS';
    reviewNote?: string;
}

export interface ProfessionalSelfProfile {
    exists: boolean;
    name: string;
    document: string;
    email: string;
    phone: string;
    specialty: string;
    licenseNumber: string;
    education: string;
    experience: string;
    biography: string;
    verificationStatus: 'SIN_PRESENTAR' | 'PENDIENTE' | 'VERIFICADA' | 'REQUIERE_CAMBIOS';
    reviewNote: string;
}

export interface UserAccount {
    id: string;
    name: string;
    email: string;
    role: AccountRole;
    active: boolean;
}

export interface Patient {
    id: string;
    fullName: string;
    document: string;
    birthDate: string | null;
    phone: string | null;
    address: string | null;
    observations: string | null;
    active: boolean;
}

export interface PatientHistory {
    id: string;
    patientId: string;
    type: string;
    description: string;
    date: string;
}

export interface PatientAssignment {
    id: string;
    patientId: string;
    professionalEmail: string;
    active: boolean;
    startDate: string;
    endDate: string | null;
}

export type AssignmentDirectoryStatus = 'ACTIVE' | 'FINALIZED' | 'NONE';
export interface PatientAssignmentSummary {
    patient: Pick<Patient, 'id' | 'fullName' | 'document' | 'active'>;
    assignmentState: AssignmentDirectoryStatus;
    currentAssignment: PatientAssignment | null;
    lastAssignment: PatientAssignment | null;
}
export interface PatientAssignmentPage {
    items: PatientAssignmentSummary[];
    page: number;
    size: number;
    total: number;
}

export interface RolePermission {
    module: string;
    operation: string;
    allowed: boolean;
}

export const PROFESSIONAL_SPECIALTIES: readonly string[] = [
    'Medicina general',
    'Geriatría',
    'Enfermería geriátrica',
    'Fisioterapia y rehabilitación',
    'Terapia ocupacional',
    'Psicología clínica y de la salud',
    'Nutrición y dietética',
    'Trabajo social',
    'Fonoaudiología',
    'Cuidado integral del adulto mayor',
];

export function isValidProfessionalSpecialty(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length < 3 || /\d/.test(trimmed)) {
        return false;
    }
    return /^[\p{L} ,.-]+$/u.test(trimmed);
}

export function isValidPersonName(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
        return false;
    }
    return /^[\p{L} ]+$/u.test(trimmed);
}
