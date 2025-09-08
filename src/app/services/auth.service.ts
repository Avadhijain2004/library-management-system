import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { MemberService } from './member.service';
import { LoginRequest, LoginResponse, AuthUser } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private storageService: StorageService,
    private memberService: MemberService
  ) {
    // Check if user is already logged in
    const storedUser = this.storageService.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch (error) {
        this.storageService.removeItem('currentUser');
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    console.log('Login attempt with credentials:', credentials);
    
    const user = this.memberService.findUserByEmail(credentials.email);
    const isValid = this.memberService.validateCredentials(credentials.email, credentials.password);

    if (isValid && user) {
      const response: LoginResponse = {
        success: true,
        message: 'Login successful',
        token: 'token-' + Date.now(),
        memberId: user.id,
        memberName: user.memberName,
        email: user.email,
        redirectUrl: '/homepage'
      };

      const authUser: AuthUser = {
        memberId: response.memberId!,
        memberName: response.memberName!,
        email: response.email!,
        token: response.token!,
        loginTime: new Date()
      };
      
      this.storageService.setItem('currentUser', JSON.stringify(authUser));
      this.currentUserSubject.next(authUser);

      console.log('Login successful, user stored:', authUser);
      return of(response);
    } else {
      const response: LoginResponse = {
        success: false,
        message: 'Invalid email or password.'
      };
      return of(response);
    }
  }

  logout(): void {
    this.storageService.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  setCurrentUser(user: any): void {
    const authUser: AuthUser = {
      memberId: user.memberId,
      memberName: user.memberName,
      email: user.email,
      token: user.token,
      loginTime: new Date(user.loginTime)
    };
    
    this.currentUserSubject.next(authUser);
    console.log('✅ AuthService: Current user updated:', authUser);
  }
}
