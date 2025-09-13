import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserBorrowInfo, BorrowHistoryEntry } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  // ✅ Mock users with their actual member IDs from registration
  private mockUsers: UserBorrowInfo[] = [
    {
      libraryId: 'LIB123456', // This should match the actual member ID from registration
      name: 'Avadhi Jain',
      email: 'avadhi@example.com',
      currentBorrowedCount: 2,
      maxBooksAllowed: 5,
      fines: 0,
      overdueBooks: 0,
      isEligible: true,
    },
    {
      libraryId: 'LIB789012',
      name: 'John Doe',
      email: 'john@example.com',
      currentBorrowedCount: 4,
      maxBooksAllowed: 5,
      fines: 25,
      overdueBooks: 1,
      isEligible: false,
    },
  ];

  constructor(private storageService: StorageService) {}

  // ✅ Get user borrow info by actual member ID
  getUserBorrowInfo(memberId: string): Observable<UserBorrowInfo> {
    console.log('🔍 Looking for user with member ID:', memberId);

    // First, try to get registered user data
    const registeredUsers = this.getRegisteredUsers();
    const registeredUser = registeredUsers.find((u) => u.id === memberId);

    if (registeredUser) {
      // Create UserBorrowInfo from registered user data
      const userBorrowInfo: UserBorrowInfo = {
        libraryId: registeredUser.id,
        name: registeredUser.memberName,
        email: registeredUser.email,
        currentBorrowedCount: this.getCurrentBorrowCount(memberId),
        maxBooksAllowed: 5,
        fines: this.getCurrentFines(memberId),
        overdueBooks: this.getOverdueCount(memberId),
        isEligible: true,
      };

      // Check eligibility
      userBorrowInfo.isEligible =
        userBorrowInfo.fines === 0 &&
        userBorrowInfo.overdueBooks === 0 &&
        userBorrowInfo.currentBorrowedCount < userBorrowInfo.maxBooksAllowed;

      console.log('✅ Found registered user:', userBorrowInfo);
      return of(userBorrowInfo).pipe(delay(500));
    }

    // Fallback to mock data (for testing)
    const mockUser = this.mockUsers.find((u) => u.libraryId === memberId);
    if (mockUser) {
      console.log('📝 Using mock user data:', mockUser);
      return of(mockUser).pipe(delay(500));
    }

    console.error('❌ User not found for member ID:', memberId);
    return throwError(() => new Error('User not found with this Member ID'));
  }

  private getRegisteredUsers(): any[] {
    try {
      const users = this.storageService.getItem('registered_users');
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Failed to get registered users:', error);
      return [];
    }
  }

  private getCurrentBorrowCount(memberId: string): number {
    // Get borrow records for this member
    const borrowRecords = this.getBorrowRecords();
    const userRecords = borrowRecords.filter(
      (record) => record.memberId === memberId
    );

    // Count currently borrowed books (not returned)
    let currentCount = 0;
    userRecords.forEach((record) => {
      if (!record.returnDate) {
        // Not returned yet
        currentCount += record.totalBooks || record.books?.length || 0;
      }
    });

    return currentCount;
  }

  private getCurrentFines(memberId: string): number {
    // Calculate fines based on overdue books
    const borrowRecords = this.getBorrowRecords();
    const userRecords = borrowRecords.filter(
      (record) => record.memberId === memberId && !record.returnDate
    );

    let totalFines = 0;
    const today = new Date();

    userRecords.forEach((record) => {
      record.books?.forEach((book: any) => {
        const dueDate = new Date(book.dueDate);
        if (today > dueDate) {
          const daysLate = Math.ceil(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          totalFines += daysLate * 5; // ₹5 per day per book
        }
      });
    });

    return totalFines;
  }

  private getOverdueCount(memberId: string): number {
    const borrowRecords = this.getBorrowRecords();
    const userRecords = borrowRecords.filter(
      (record) => record.memberId === memberId && !record.returnDate
    );

    let overdueCount = 0;
    const today = new Date();

    userRecords.forEach((record) => {
      record.books?.forEach((book: any) => {
        const dueDate = new Date(book.dueDate);
        if (today > dueDate) {
          overdueCount++;
        }
      });
    });

    return overdueCount;
  }

  private getBorrowRecords(): any[] {
    try {
      const records = this.storageService.getItem('borrow_records');
      return records ? JSON.parse(records) : [];
    } catch (error) {
      console.error('Failed to get borrow records:', error);
      return [];
    }
  }

  // ✅ Get borrow history for specific member
  // ✅ CORRECTED: Get borrow history for specific member
getUserBorrowHistory(memberId: string): Observable<BorrowHistoryEntry[]> {
  const borrowRecords = this.getBorrowRecords();
  const userRecords = borrowRecords.filter(record => record.memberId === memberId);
  
  const history: BorrowHistoryEntry[] = [];
  
  userRecords.forEach((record: any) => {
    if (record.books && Array.isArray(record.books)) {
      record.books.forEach((book: any, index: number) => {
        const bookData = this.getBookData(book.bookId);
        
        // ✅ FIX: Include ALL required properties from BorrowHistoryEntry
        const historyEntry: BorrowHistoryEntry = {
          id: `${record.id}_${index}`,
          bookId: book.bookId || `BOOK_${index}`,
          title: bookData?.title || 'Unknown Book',
          author: bookData?.author || 'Unknown Author',
          category: bookData?.category || 'General',
          isbn: bookData?.isbn || '',
          borrowDate: book.borrowDate || record.borrowDate || new Date().toISOString(),
          dueDate: book.dueDate || new Date().toISOString(),
          returnedDate: record.returnDate || undefined,
          fineAmount: this.calculateBookFine(book.dueDate, record.returnDate),
          finePaid: false, // ✅ ADD THIS REQUIRED PROPERTY
          status: this.getBookStatus(book.dueDate, record.returnDate),
          notes: record.notes || book.notes || ''
        };
        
        history.push(historyEntry);
      });
    }
  });
  
  // Sort by borrow date (most recent first)
  history.sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
  
  return of(history).pipe(delay(500));
}


  private getBookData(bookId: string): any {
    // In a real app, this would query the book service
    // For now, return mock data
    const mockBooks: any = {
      BK001: { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
      BK002: { title: 'To Kill a Mockingbird', author: 'Harper Lee' },
      BK003: { title: '1984', author: 'George Orwell' },
      BK004: { title: 'Angular Complete Guide', author: 'John Smith' },
    };

    return mockBooks[bookId];
  }

  private calculateBookFine(dueDate: string, returnDate?: string): number {
    const due = new Date(dueDate);
    const returned = returnDate ? new Date(returnDate) : new Date();

    if (returned <= due) return 0;

    const daysLate = Math.ceil(
      (returned.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLate * 5; // ₹5 per day
  }

  private getBookStatus(
    dueDate: string,
    returnDate?: string
  ): 'Borrowed' | 'Returned' | 'Overdue' {
    if (returnDate) {
      return 'Returned';
    }

    const due = new Date(dueDate);
    const today = new Date();

    return today > due ? 'Overdue' : 'Borrowed';
  }

  updateUserBorrowCount(
    memberId: string,
    increment: number
  ): Observable<boolean> {
    // In a real app, this would update the backend
    console.log(`📊 Updating borrow count for ${memberId} by ${increment}`);
    return of(true).pipe(delay(300));
  }
}
