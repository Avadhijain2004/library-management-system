export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  memberId?: string;
  memberName?: string;
  email?: string;
  redirectUrl?: string;
}

export interface AuthUser {
  memberId: string;
  memberName: string;
  email: string;
  token: string;
  loginTime: Date;
}

export interface PasswordResetRequest {
  email: string;
}

export interface AccountLockInfo {
  email: string;
  attempts: number;
  lockedUntil?: Date;
  isLocked: boolean;
}
