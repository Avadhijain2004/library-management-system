import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { 
  MemberRegistrationRequest, 
  MemberRegistrationResponse, 
  CountryCode 
} from '../models/member.model';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl = 'http://localhost:8080/api/members';
  private readonly REGISTERED_USERS_KEY = 'registered_users';
  
  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  registerMember(memberData: MemberRegistrationRequest): Observable<MemberRegistrationResponse> {
    console.log('Starting registration process for:', memberData.email);
    
    const registeredUsers = this.getRegisteredUsers();
    console.log('Existing users count:', registeredUsers.length);
    
    const emailExists = registeredUsers.some(user => 
      user.email.toLowerCase() === memberData.email.toLowerCase()
    );
    
    if (emailExists) {
      console.log('Email already exists');
      return throwError(() => new Error('Email already registered.'));
    }

    const memberId = 'LIB' + Date.now().toString().slice(-6);
    
    const newUser = {
      id: memberId,
      memberName: memberData.memberName,
      email: memberData.email.toLowerCase(),
      password: memberData.password,
      countryCode: memberData.countryCode,
      mobileNumber: memberData.mobileNumber,
      address: memberData.address,
      dateOfBirth: memberData.dateOfBirth,
      secretQuestion: memberData.secretQuestion,
      secretAnswer: memberData.secretAnswer,
      createdAt: new Date().toISOString()
    };
    
    registeredUsers.push(newUser);
    
    try {
      this.storageService.setItem(this.REGISTERED_USERS_KEY, JSON.stringify(registeredUsers));
      console.log('✅ User saved successfully:', newUser);
    } catch (error) {
      console.error('❌ Failed to save user:', error);
      return throwError(() => new Error('Failed to save user data'));
    }

    const response: MemberRegistrationResponse = {
      success: true,
      message: 'Registration successful!',
      memberId: memberId,
      memberName: memberData.memberName,
      email: memberData.email
    };

    return of(response).pipe(delay(100));
  }

  getRegisteredUsers(): any[] {
    try {
      const users = this.storageService.getItem(this.REGISTERED_USERS_KEY);
      const parsedUsers = users ? JSON.parse(users) : [];
      console.log('📂 Retrieved users from storage:', parsedUsers);
      return parsedUsers;
    } catch (error) {
      console.error('❌ Failed to get registered users:', error);
      return [];
    }
  }

  findUserByEmail(email: string): any | null {
    const users = this.getRegisteredUsers();
    const normalizedEmail = email.toLowerCase().trim();
    const user = users.find(user => user.email.toLowerCase().trim() === normalizedEmail);
    
    console.log('🔍 Searching for email:', normalizedEmail);
    console.log('📋 Available emails:', users.map(u => u.email));
    console.log('✅ User found:', !!user);
    
    return user || null;
  }

  validateCredentials(email: string, password: string): boolean {
    const user = this.findUserByEmail(email);
    if (!user) {
      console.log('❌ User not found for email:', email);
      return false;
    }
    
    const isValid = user.password === password;
    console.log('🔐 Password validation for', email, ':', isValid);
    
    return isValid;
  }

  checkEmailExists(email: string): Observable<boolean> {
    const users = this.getRegisteredUsers();
    const exists = users.some(user => user.email.toLowerCase() === email.toLowerCase());
    return of(exists).pipe(delay(300));
  }

  checkMobileExists(countryCode: string, mobileNumber: string): Observable<boolean> {
    const users = this.getRegisteredUsers();
    const exists = users.some(user => 
      user.countryCode === countryCode && user.mobileNumber === mobileNumber
    );
    return of(exists).pipe(delay(300));
  }

  getCountryCodes(): CountryCode[] {
    return [
      { code: 'IN', name: 'India', dialCode: '+91' },
      { code: 'US', name: 'United States', dialCode: '+1' },
      { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
      { code: 'CA', name: 'Canada', dialCode: '+1' },
      { code: 'AU', name: 'Australia', dialCode: '+61' },
      // ... rest of country codes
    ];
  }

  clearAllUsers(): void {
    this.storageService.removeItem(this.REGISTERED_USERS_KEY);
    console.log('🗑️ All users cleared');
  }
}
