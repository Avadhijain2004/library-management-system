import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Subscription, Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { BookService } from '../../services/book.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { Book, BorrowItem, SearchCriteria } from '../../models/book.model';
import { UserBorrowInfo } from '../../models/user.model';
import { NavbarComponent } from '../navbar/navbar.component';
import { UserDataService } from '../../services/user-data.service';

@Component({
  selector: 'app-borrow-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './borrow-books.component.html',
  styleUrls: ['./borrow-books.component.css']
})
export class BorrowBooksComponent implements OnInit, OnDestroy {
  // Forms
  searchForm!: FormGroup;

  // Data
  books: Book[] = [];
  filteredBooks: Book[] = [];
  selectedBooks: Map<string, number> = new Map();
  userBorrowInfo: UserBorrowInfo | null = null;
  currentUser: any = null;

  // States
  isLoadingBooks = false;
  isLoadingUser = false;
  isSearching = false;
  showConfirmation = false;
  
  // Messages
  errorMessage = '';
  successMessage = '';
  
  // Constants
  readonly MAX_BOOKS_PER_USER = 5;
  readonly BORROW_PERIOD_DAYS = 14;
  readonly FINE_PER_DAY = 5;

  // Subjects
  private searchSubject = new Subject<SearchCriteria>();
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private bookService: BookService,
    private userService: UserService,
    private authService: AuthService,
    private storageService: StorageService,
    private userDataService: UserDataService, 
    public router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadBooks();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForms(): void {
    this.searchForm = this.fb.group({
      title: [''],
      author: [''],
      category: ['']
    });
  }

  // ✅ Auto-load current user and their borrow info
  public loadCurrentUser(): void {
  this.subscriptions.add(
    this.userDataService.userData$.subscribe(userData => {
      this.currentUser = userData.user;
      this.userBorrowInfo = userData.borrowInfo;
      this.isLoadingUser = userData.isLoading;
      
      if (userData.error) {
        this.errorMessage = userData.error;
      }
      
      if (userData.borrowInfo) {
        this.validateUserEligibility(userData.borrowInfo);
      }
    })
  );
}


  // ✅ Securely fetch user info using their actual member ID
  private fetchUserInfoSecurely(memberId: string): void {
    this.isLoadingUser = true;
    this.clearMessages();

    console.log('🔒 Fetching borrow info for member:', memberId);

    this.subscriptions.add(
      this.userService.getUserBorrowInfo(memberId).subscribe({
        next: (userInfo) => {
          this.userBorrowInfo = userInfo;
          this.isLoadingUser = false;
          this.validateUserEligibility(userInfo);
          console.log('✅ User borrow info loaded:', userInfo);
        },
        error: (error) => {
          this.showError('Failed to load your borrowing information.');
          this.isLoadingUser = false;
          console.error('❌ Failed to load user info:', error);
        }
      })
    );
  }

  private loadBooks(): void {
    this.isLoadingBooks = true;
    this.subscriptions.add(
      this.bookService.getAllBooks().subscribe({
        next: (books: Book[]) => {
          this.books = books;
          this.filteredBooks = books;
          this.isLoadingBooks = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to load books. Please try again.';
          this.isLoadingBooks = false;
        }
      })
    );
  }

  private setupSearch(): void {
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        switchMap(criteria => {
          this.isSearching = true;
          return this.performSearch(criteria);
        })
      ).subscribe({
        next: (books: Book[]) => {
          this.filteredBooks = books;
          this.isSearching = false;
        },
        error: () => {
          this.isSearching = false;
        }
      })
    );
  }

  private performSearch(criteria: SearchCriteria): Observable<Book[]> {
    let filtered = [...this.books];

    if (criteria.title?.trim()) {
      const titleQuery = criteria.title.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(titleQuery)
      );
    }

    if (criteria.author?.trim()) {
      const authorQuery = criteria.author.toLowerCase();
      filtered = filtered.filter(book => 
        book.author.toLowerCase().includes(authorQuery)
      );
    }

    if (criteria.category?.trim()) {
      const categoryQuery = criteria.category.toLowerCase();
      filtered = filtered.filter(book => 
        book.category.toLowerCase().includes(categoryQuery)
      );
    }

    return of(filtered);
  }

  onSearch(): void {
    const criteria: SearchCriteria = this.searchForm.value;
    this.searchSubject.next(criteria);
  }

  onClearSearch(): void {
    this.searchForm.reset();
    this.filteredBooks = [...this.books];
  }

  onQuantityChange(bookId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const quantity = parseInt(target.value, 10) || 0;
    
    if (quantity <= 0) {
      this.selectedBooks.delete(bookId);
    } else {
      const book = this.books.find(b => b.id === bookId);
      if (book && quantity > book.availableCopies) {
        this.showError(`Only ${book.availableCopies} copies of "${book.title}" are available.`);
        target.value = book.availableCopies.toString();
        this.selectedBooks.set(bookId, book.availableCopies);
      } else {
        this.selectedBooks.set(bookId, quantity);
      }
    }
    
    this.validateSelection();
  }

  private validateSelection(): void {
    const totalSelected = this.getTotalSelectedCopies();
    if (this.userBorrowInfo) {
      const totalAfterBorrow = this.userBorrowInfo.currentBorrowedCount + totalSelected;
      if (totalAfterBorrow > this.MAX_BOOKS_PER_USER) {
        this.showError(`You cannot borrow more than ${this.MAX_BOOKS_PER_USER} books in total.`);
      } else {
        this.clearError();
      }
    }
  }

  private validateUserEligibility(userInfo: UserBorrowInfo): void {
    if (userInfo.fines > 0) {
      this.showError(`You have pending fines of ₹${userInfo.fines}. Please clear them before borrowing.`);
      return;
    }

    if (userInfo.overdueBooks > 0) {
      this.showError(`You have ${userInfo.overdueBooks} overdue book(s). Please return them first.`);
      return;
    }

    if (userInfo.currentBorrowedCount >= this.MAX_BOOKS_PER_USER) {
      this.showError(`You have already borrowed the maximum allowed ${this.MAX_BOOKS_PER_USER} books.`);
      return;
    }

    this.showSuccess(`Welcome ${userInfo.name}! You can borrow up to ${this.MAX_BOOKS_PER_USER - userInfo.currentBorrowedCount} more book(s).`);
  }

  confirmBorrow(): void {
    if (!this.userBorrowInfo) {
      this.showError('User information not available.');
      return;
    }

    if (this.selectedBooks.size === 0) {
      this.showError('Please select at least one book to borrow.');
      return;
    }

    const totalSelected = this.getTotalSelectedCopies();
    const totalAfterBorrow = this.userBorrowInfo.currentBorrowedCount + totalSelected;

    if (totalAfterBorrow > this.MAX_BOOKS_PER_USER) {
      this.showError(`Cannot borrow ${totalSelected} book(s). You would exceed the maximum limit of ${this.MAX_BOOKS_PER_USER} books.`);
      return;
    }

    // Validate individual book availability
    for (const [bookId, quantity] of this.selectedBooks) {
      const book = this.books.find(b => b.id === bookId);
      if (book && quantity > book.availableCopies) {
        this.showError(`Not enough copies of "${book.title}" available.`);
        return;
      }
    }

    this.showConfirmation = true;
  }

  processBorrow(): void {
  if (!this.userBorrowInfo || !this.currentUser) return;

  try {
    // Update book inventory
    for (const [bookId, quantity] of this.selectedBooks) {
      const book = this.books.find(b => b.id === bookId);
      if (book) {
        book.availableCopies -= quantity;
        const filteredBook = this.filteredBooks.find(b => b.id === bookId);
        if (filteredBook) {
          filteredBook.availableCopies = book.availableCopies;
        }
      }
    }

    // ✅ Create expanded borrow records (one for each copy)
    const borrowBooks: any[] = [];
    for (const [bookId, quantity] of this.selectedBooks) {
      // Create multiple records for multiple copies
      for (let i = 0; i < quantity; i++) {
        borrowBooks.push({
          bookId,
          quantity: 1, // Each record represents 1 copy
          borrowDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + this.BORROW_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    // Update user borrow count
    const totalBorrowed = this.getTotalSelectedCopies();
    const newBorrowCount = this.userBorrowInfo.currentBorrowedCount + totalBorrowed;
    
    // Update shared borrow info
    this.userDataService.updateBorrowInfo({
      currentBorrowedCount: newBorrowCount
    });

    // Create borrow record
    const borrowRecord = {
      memberId: this.currentUser.memberId,
      books: borrowBooks,
      totalBooks: totalBorrowed,
      borrowDate: new Date().toISOString()
    };

    this.saveBorrowRecord(borrowRecord);

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.BORROW_PERIOD_DAYS);

    const borrowedBooksList = Array.from(this.selectedBooks.entries())
      .map(([bookId, quantity]) => {
        const book = this.books.find(b => b.id === bookId);
        return `${quantity}x ${book?.title}`;
      })
      .join(', ');

    this.showSuccess(
      `✅ Borrow successful! Books: ${borrowedBooksList}. Due date: ${dueDate.toLocaleDateString()}. Fine of ₹${this.FINE_PER_DAY} per day will be charged for late returns.`
    );

    // ✅ Force refresh of My Books data
    setTimeout(() => {
      this.userDataService.refreshUserData();
      // Also manually refresh the storage to trigger My Books update
      window.dispatchEvent(new Event('storage'));
    }, 1000);

    // Reset form
    this.selectedBooks.clear();
    this.showConfirmation = false;
    
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach(input => input.value = '');
    }, 100);

  } catch (error) {
    this.showError('Failed to process borrow request. Please try again.');
    console.error('Borrow processing error:', error);
  }
}

  private saveBorrowRecord(borrowRecord: any): void {
  try {
    const existingRecords = JSON.parse(this.storageService.getItem('borrow_records') || '[]');
    
    // ✅ Create individual records for each book borrowed
    const newRecords = borrowRecord.books.map((book: any, index: number) => {
      const bookDetails = this.books.find(b => b.id === book.bookId);
      return {
        id: `BR${Date.now()}_${index}`,
        memberId: borrowRecord.memberId,
        bookId: book.bookId,
        title: bookDetails?.title || 'Unknown Title',
        author: bookDetails?.author || 'Unknown Author',
        borrowDate: book.borrowDate,
        dueDate: book.dueDate,
        // Don't set returnDate for new borrows
        notes: `Borrowed ${book.quantity} cop${book.quantity > 1 ? 'ies' : 'y'}`,
        quantity: book.quantity
      };
    });

    // Add all new records to existing ones
    existingRecords.push(...newRecords);
    
    // Save back to storage
    this.storageService.setItem('borrow_records', JSON.stringify(existingRecords));
    
    console.log('📝 Individual borrow records saved:', newRecords);
  } catch (error) {
    console.error('Error saving borrow records:', error);
    throw error;
  }
}

  cancelBorrow(): void {
    this.showConfirmation = false;
  }

  getTotalSelectedCopies(): number {
    return Array.from(this.selectedBooks.values()).reduce((sum, quantity) => sum + quantity, 0);
  }

  getSelectedBookDetails(): Array<{book: Book, quantity: number}> {
    return Array.from(this.selectedBooks.entries()).map(([bookId, quantity]) => ({
      book: this.books.find(b => b.id === bookId)!,
      quantity
    }));
  }

  // Getter for calculated due date
  get calculatedDueDate(): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.BORROW_PERIOD_DAYS);
    return dueDate.toLocaleDateString();
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.clearError(), 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.clearSuccess(), 10000);
  }

  private clearError(): void {
    this.errorMessage = '';
  }

  private clearSuccess(): void {
    this.successMessage = '';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Utility methods
  trackByBookId(index: number, book: Book): string {
    return book.id;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/200x280?text=No+Image';
    }
  }

  navigateToMyBooks(): void {
  this.userDataService.refreshUserData();
  this.router.navigate(['/my-books']);
}
}

