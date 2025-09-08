import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserBorrowInfo } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private mockUsers: UserBorrowInfo[] = [
    {
      libraryId: 'LIB001',
      name: 'Avadhi Jain',
      email: 'avadhi@example.com',
      currentBorrowedCount: 2,
      maxBooksAllowed: 5,
      fines: 0,
      overdueBooks: 0,
      isEligible: true
    },
    {
      libraryId: 'LIB002',
      name: 'John Doe',
      email: 'john@example.com',
      currentBorrowedCount: 4,
      maxBooksAllowed: 5,
      fines: 25,
      overdueBooks: 1,
      isEligible: false
    },
    {
      libraryId: 'LIB003',
      name: 'Jane Smith',
      email: 'jane@example.com',
      currentBorrowedCount: 5,
      maxBooksAllowed: 5,
      fines: 0,
      overdueBooks: 0,
      isEligible: false // Already at max limit
    }
  ];

  constructor() {}

  getUserBorrowInfo(libraryId: string): Observable<UserBorrowInfo> {
    const user = this.mockUsers.find(u => u.libraryId.toLowerCase() === libraryId.toLowerCase());
    if (!user) {
      throw new Error('User not found with this Library ID');
    }
    return of(user).pipe(delay(500));
  }

  updateUserBorrowCount(libraryId: string, increment: number): Observable<boolean> {
    const user = this.mockUsers.find(u => u.libraryId === libraryId);
    if (user) {
      user.currentBorrowedCount += increment;
    }
    return of(true).pipe(delay(300));
  }
}
