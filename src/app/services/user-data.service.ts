import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { StorageService } from './storage.service';
import { AuthUser } from '../models/auth.model';
import { UserBorrowInfo } from '../models/user.model';
interface UserData {
  user: AuthUser | null;
  borrowInfo: UserBorrowInfo | null;
  isLoading: boolean;
  error: string | null;
}
@Injectable({
  providedIn: 'root'
})
export class UserDataService {
  private userDataSubject = new BehaviorSubject<UserData>({
    user: null,
    borrowInfo: null,
    isLoading: false,
    error: null
  });
  public userData$ = this.userDataSubject.asObservable();
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private storageService: StorageService
  ) {
    this.initializeUserData();
  }
  private initializeUserData(): void {
    // Listen to auth user changes and automatically load borrow info
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserBorrowInfo(user.memberId);
      } else {
        this.updateUserData({
          user: null,
          borrowInfo: null,
          isLoading: false,
          error: null
        });
      }
    });
  }
  private loadUserBorrowInfo(memberId: string): void {
    this.updateUserData({ ...this.userDataSubject.value, isLoading: true, error: null });
    this.userService.getUserBorrowInfo(memberId).subscribe({
      next: (borrowInfo) => {
        const user = this.authService.getCurrentUser();
        this.updateUserData({
          user,
          borrowInfo,
          isLoading: false,
          error: null
        });
        console.log('✅ User data synchronized:', { user: user?.memberName, borrowInfo });
      },
      error: (error) => {
        this.updateUserData({
          ...this.userDataSubject.value,
          isLoading: false,
          error: 'Failed to load user borrowing information'
        });
        console.error('❌ Error loading user borrow info:', error);
      }
    });
  }
  private updateUserData(data: UserData): void {
    this.userDataSubject.next(data);
  }
  // ✅ Method to refresh data after borrowing/returning books
  public refreshUserData(): void {
  const currentUser = this.authService.getCurrentUser();
  if (currentUser?.memberId) {
    this.loadUserBorrowInfo(currentUser.memberId);
    
    // Dispatch custom event to trigger My Books refresh
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('refresh-my-books'));
    }, 500);
  }
}
  // ✅ Method to update borrow info after transactions
  updateBorrowInfo(updatedInfo: Partial<UserBorrowInfo>): void {
    const currentData = this.userDataSubject.value;
    if (currentData.borrowInfo) {
      const updated = { ...currentData.borrowInfo, ...updatedInfo };
      this.updateUserData({
        ...currentData,
        borrowInfo: updated
      });
    }
  }
  getCurrentUserData(): UserData {
    return this.userDataSubject.value;
  }
  public forceRefresh(): void {
  const currentUser = this.authService.getCurrentUser();
  if (currentUser?.memberId) {
    console.log('🔄 Force refreshing user data for:', currentUser.memberId);
    this.loadUserBorrowInfo(currentUser.memberId);
  }
}
}