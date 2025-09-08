import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Subscription, Observable, of } from 'rxjs'; // ✅ Added Observable import
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';

import { BookService } from '../../services/book.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Book, BorrowItem, SearchCriteria } from '../../models/book.model';
import { UserBorrowInfo } from '../../models/user.model';
import { NavbarComponent } from "../navbar/navbar.component";

@Component({
  selector: 'app-borrow-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './borrow-books.component.html',
  styleUrls: ['./borrow-books.component.css'],
})
export class BorrowBooksComponent implements OnInit, OnDestroy {
  // Forms
  searchForm!: FormGroup;
  userForm!: FormGroup;

  // Data
  books: Book[] = [];
  filteredBooks: Book[] = [];
  selectedBooks: Map<string, number> = new Map();
  userBorrowInfo: UserBorrowInfo | null = null;

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
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
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
      category: [''],
    });

    this.userForm = this.fb.group({
      libraryId: ['', [Validators.required, Validators.pattern(/^LIB\d{3}$/)]],
    });
  }

  private loadBooks(): void {
    this.isLoadingBooks = true;
    this.subscriptions.add(
      this.bookService.getAllBooks().subscribe({
        next: (books: Book[]) => {
          // ✅ Fixed type annotation
          this.books = books;
          this.filteredBooks = books;
          this.isLoadingBooks = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to load books. Please try again.';
          this.isLoadingBooks = false;
        },
      })
    );
  }

  private setupSearch(): void {
    this.subscriptions.add(
      this.searchSubject
        .pipe(
          debounceTime(300),
          distinctUntilChanged(
            (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
          ),
          switchMap((criteria) => {
            this.isSearching = true;
            return this.performSearch(criteria);
          })
        )
        .subscribe({
          next: (books: Book[]) => {
            // ✅ Fixed type annotation
            this.filteredBooks = books;
            this.isSearching = false;
          },
          error: () => {
            this.isSearching = false;
          },
        })
    );
  }

  private performSearch(criteria: SearchCriteria): Observable<Book[]> {
    // ✅ Added Observable return type
    let filtered = [...this.books];

    if (criteria.title?.trim()) {
      const titleQuery = criteria.title.toLowerCase();
      filtered = filtered.filter((book) =>
        book.title.toLowerCase().includes(titleQuery)
      );
    }

    if (criteria.author?.trim()) {
      const authorQuery = criteria.author.toLowerCase();
      filtered = filtered.filter((book) =>
        book.author.toLowerCase().includes(authorQuery)
      );
    }

    if (criteria.category?.trim()) {
      const categoryQuery = criteria.category.toLowerCase();
      filtered = filtered.filter((book) =>
        book.category.toLowerCase().includes(categoryQuery)
      );
    }

    return of(filtered); // ✅ Returns Observable<Book[]>
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
      const book = this.books.find((b) => b.id === bookId);
      if (book && quantity > book.availableCopies) {
        this.showError(
          `Only ${book.availableCopies} copies of "${book.title}" are available.`
        );
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
      const totalAfterBorrow =
        this.userBorrowInfo.currentBorrowedCount + totalSelected;
      if (totalAfterBorrow > this.MAX_BOOKS_PER_USER) {
        this.showError(
          `You cannot borrow more than ${this.MAX_BOOKS_PER_USER} books in total.`
        );
      } else {
        this.clearError();
      }
    }
  }

  fetchUserInfo(): void {
    const libraryId = this.userForm.get('libraryId')?.value;
    if (!libraryId || this.userForm.invalid) {
      this.showError('Please enter a valid Library ID (format: LIB001)');
      return;
    }

    this.isLoadingUser = true;
    this.userBorrowInfo = null;
    this.clearMessages();

    this.subscriptions.add(
      this.userService.getUserBorrowInfo(libraryId).subscribe({
        next: (userInfo) => {
          this.userBorrowInfo = userInfo;
          this.isLoadingUser = false;
          this.validateUserEligibility(userInfo);
        },
        error: (error) => {
          this.showError('User not found. Please check your Library ID.');
          this.isLoadingUser = false;
        },
      })
    );
  }

  private validateUserEligibility(userInfo: UserBorrowInfo): void {
    if (userInfo.fines > 0) {
      this.showError(
        `You have pending fines of ₹${userInfo.fines}. Please clear them before borrowing.`
      );
      return;
    }

    if (userInfo.overdueBooks > 0) {
      this.showError(
        `You have ${userInfo.overdueBooks} overdue book(s). Please return them first.`
      );
      return;
    }

    if (userInfo.currentBorrowedCount >= this.MAX_BOOKS_PER_USER) {
      this.showError(
        `You have already borrowed the maximum allowed ${this.MAX_BOOKS_PER_USER} books.`
      );
      return;
    }

    this.showSuccess(
      `Welcome ${userInfo.name}! You can borrow up to ${
        this.MAX_BOOKS_PER_USER - userInfo.currentBorrowedCount
      } more book(s).`
    );
  }

  confirmBorrow(): void {
    if (!this.userBorrowInfo) {
      this.showError('Please fetch user information first.');
      return;
    }

    if (this.selectedBooks.size === 0) {
      this.showError('Please select at least one book to borrow.');
      return;
    }

    const totalSelected = this.getTotalSelectedCopies();
    const totalAfterBorrow =
      this.userBorrowInfo.currentBorrowedCount + totalSelected;

    if (totalAfterBorrow > this.MAX_BOOKS_PER_USER) {
      this.showError(
        `Cannot borrow ${totalSelected} book(s). You would exceed the maximum limit of ${this.MAX_BOOKS_PER_USER} books.`
      );
      return;
    }

    // Validate individual book availability
    for (const [bookId, quantity] of this.selectedBooks) {
      const book = this.books.find((b) => b.id === bookId);
      if (book && quantity > book.availableCopies) {
        this.showError(`Not enough copies of "${book.title}" available.`);
        return;
      }
    }

    this.showConfirmation = true;
  }

  processBorrow(): void {
    if (!this.userBorrowInfo) return;

    // Update book inventory
    for (const [bookId, quantity] of this.selectedBooks) {
      const book = this.books.find((b) => b.id === bookId);
      if (book) {
        book.availableCopies -= quantity;
        // Update filtered books as well
        const filteredBook = this.filteredBooks.find((b) => b.id === bookId);
        if (filteredBook) {
          filteredBook.availableCopies = book.availableCopies;
        }
      }
    }

    // Update user borrow count
    this.userBorrowInfo.currentBorrowedCount += this.getTotalSelectedCopies();

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.BORROW_PERIOD_DAYS);

    const borrowedBooksList = Array.from(this.selectedBooks.entries())
      .map(([bookId, quantity]) => {
        const book = this.books.find((b) => b.id === bookId);
        return `${quantity}x ${book?.title}`;
      })
      .join(', ');

    this.showSuccess(
      `Borrow successful! Books: ${borrowedBooksList}. Due date: ${dueDate.toLocaleDateString()}. Fine of ₹${
        this.FINE_PER_DAY
      } per day will be charged for late returns.`
    );

    // Reset form
    this.selectedBooks.clear();
    this.showConfirmation = false;

    // Reset quantity inputs
    const inputs = document.querySelectorAll(
      'input[type="number"]'
    ) as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => (input.value = ''));
  }

  cancelBorrow(): void {
    this.showConfirmation = false;
  }

  getTotalSelectedCopies(): number {
    return Array.from(this.selectedBooks.values()).reduce(
      (sum, quantity) => sum + quantity,
      0
    );
  }

  getSelectedBookDetails(): Array<{ book: Book; quantity: number }> {
    return Array.from(this.selectedBooks.entries()).map(
      ([bookId, quantity]) => ({
        book: this.books.find((b) => b.id === bookId)!,
        quantity,
      })
    );
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

  // Add this getter method to your BorrowBooksComponent class
  get calculatedDueDate(): string {
    const dueDate = new Date(
      Date.now() + this.BORROW_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );
    return dueDate.toLocaleDateString();
  }
}
