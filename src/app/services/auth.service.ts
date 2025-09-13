import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { AuthUser } from '../models/auth.model';
import { UserBorrowInfo } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // ✅ Add user borrow info state management
  private userBorrowInfoSubject = new BehaviorSubject<UserBorrowInfo | null>(null);
  public userBorrowInfo$ = this.userBorrowInfoSubject.asObservable();

  constructor(
    private router: Router,
    private storageService: StorageService
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const storedUser = this.storageService.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.loginTime && typeof user.loginTime === 'string') {
          user.loginTime = new Date(user.loginTime);
        }
        this.currentUserSubject.next(user);
        console.log('✅ Loaded stored user:', user);
      } catch (error) {
        console.error('Error loading stored user:', error);
        this.storageService.removeItem('currentUser');
      }
    }
  }

  login(credentials: any): Observable<any> {
    const registeredUsers = JSON.parse(this.storageService.getItem('registered_users') || '[]');
    const user = registeredUsers.find((u: any) => 
      u.email.toLowerCase() === credentials.email.toLowerCase() && 
      u.password === credentials.password
    );

    if (user) {
      const authUser: AuthUser = {
        memberId: user.id,
        memberName: user.memberName,
        email: user.email,
        token: 'mock-jwt-token-' + Date.now(),
        loginTime: new Date()
      };

      this.setCurrentUser(authUser);
      return new BehaviorSubject({ success: true, user: authUser });
    } else {
      return new BehaviorSubject({ success: false, message: 'Invalid credentials' });
    }
  }

  setCurrentUser(user: AuthUser): void {
    const userToStore = {
      ...user,
      loginTime: user.loginTime instanceof Date ? user.loginTime.toISOString() : user.loginTime
    };
    
    this.storageService.setItem('currentUser', JSON.stringify(userToStore));
    this.currentUserSubject.next(user);
    console.log('🔄 User data updated across all components:', user.memberName);
  }

  // ✅ Method to update user borrow info across all components
  setUserBorrowInfo(borrowInfo: UserBorrowInfo): void {
    this.userBorrowInfoSubject.next(borrowInfo);
    console.log('📊 User borrow info updated across all components:', borrowInfo);
  }

  updateUserProfile(updatedData: Partial<AuthUser>): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      const updatedUser = { 
        ...currentUser, 
        ...updatedData
      };
      this.setCurrentUser(updatedUser);
    }
  }

  // ✅ Method to refresh user data after borrowing/returning books
  refreshUserData(): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser?.memberId) {
      // Trigger refresh by emitting the current user again
      this.currentUserSubject.next(currentUser);
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getUserBorrowInfo(): UserBorrowInfo | null {
    return this.userBorrowInfoSubject.value;
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  logout(): void {
    this.storageService.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.userBorrowInfoSubject.next(null);
    this.router.navigate(['/login']);
  }
}
