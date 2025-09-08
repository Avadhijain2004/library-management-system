import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';
import { of } from 'rxjs';

import { BookService } from '../../services/book.service';
import { Book, SearchCriteria, BookCategory } from '../../models/book.model';
import { NavbarComponent } from "../navbar/navbar.component";

@Component({
  selector: 'app-search-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './search-books.component.html',
  styleUrls: ['./search-books.component.css'],
})
export class SearchBooksComponent implements OnInit, OnDestroy {
  searchForm!: FormGroup;
  searchResults: Book[] = [];
  categories: BookCategory[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  showAvailabilityModal = false;
  modalMessage = '';
  selectedBook: Book | null = null;

  private searchSubject = new Subject<SearchCriteria>();
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private bookService: BookService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadCategories();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initForm(): void {
    this.searchForm = this.fb.group({
      author: [''],
      title: [''],
      category: [''],
      bookId: [''],
    });
  }

  private loadCategories(): void {
    this.subscription.add(
      this.bookService.getBookCategories().subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        },
      })
    );
  }

  private setupSearch(): void {
    this.subscription.add(
      this.searchSubject
        .pipe(
          debounceTime(300),
          distinctUntilChanged(
            (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
          ),
          switchMap((criteria) => {
            this.isLoading = true;
            this.errorMessage = '';
            return this.bookService.searchBooks(criteria).pipe(
              catchError((error) => {
                this.errorMessage = 'Failed to search books. Please try again.';
                this.isLoading = false;
                return of({ books: [], totalCount: 0, searchTerm: '' });
              })
            );
          })
        )
        .subscribe({
          next: (result) => {
            this.searchResults = result.books;
            this.searchTerm = result.searchTerm;
            this.isLoading = false;
          },
        })
    );
  }

  onSearch(): void {
    const criteria: SearchCriteria = this.searchForm.value;

    // Check if at least one field is filled
    if (
      !criteria.author?.trim() &&
      !criteria.title?.trim() &&
      !criteria.category?.trim() &&
      !criteria.bookId?.trim()
    ) {
      this.errorMessage =
        'Please enter at least one search criterion (Author, Title, Category, or Book ID)';
      this.searchResults = [];
      return;
    }

    this.errorMessage = '';
    this.searchSubject.next(criteria);
  }

  onQuickSearch(field: string, value: string): void {
    this.searchForm.patchValue({ [field]: value });
    const criteria: SearchCriteria = { [field]: value };
    this.searchSubject.next(criteria);
  }

  onClearSearch(): void {
    this.searchForm.reset();
    this.searchResults = [];
    this.errorMessage = '';
    this.searchTerm = '';
  }

  checkAvailability(book: Book): void {
    this.selectedBook = book;

    if (!book.isAvailable) {
      this.modalMessage =
        'This book is currently unavailable. Please select a different category or book.';
      this.showAvailabilityModal = true;
      return;
    }

    if (book.availableCopies === 0) {
      this.modalMessage =
        'This book is currently borrowed by another member and will be available after 7 Days.';
      this.showAvailabilityModal = true;
      return;
    }

    // Book is available - proceed to borrow
    this.borrowBook(book);
  }

  borrowBook(book: Book): void {
    console.log('Borrowing book:', book.title);
    // Redirect to borrow page with book ID
    this.router.navigate(['/borrow'], { queryParams: { bookId: book.id } });
  }

  viewBookDetails(book: Book): void {
    this.router.navigate(['/book-details', book.id]);
  }

  closeModal(): void {
    this.showAvailabilityModal = false;
    this.modalMessage = '';
    this.selectedBook = null;
  }

  getAvailabilityStatus(book: Book): string {
    if (!book.isAvailable) {
      return 'Unavailable';
    }
    if (book.availableCopies === 0) {
      return 'All Borrowed';
    }
    return `${book.availableCopies} Available`;
  }

  getAvailabilityClass(book: Book): string {
    if (!book.isAvailable) {
      return 'status-unavailable';
    }
    if (book.availableCopies === 0) {
      return 'status-borrowed';
    }
    if (book.availableCopies <= 2) {
      return 'status-limited';
    }
    return 'status-available';
  }

  getStarArray(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  getEmptyStarArray(rating: number): number[] {
    return Array(5 - Math.floor(rating)).fill(0);
  }

  // Fix the trackById method (if it doesn't exist or has issues)
  trackById(index: number, book: Book): string {
    return book?.id || index.toString();
  }

  // Add this method to your SearchBooksComponent class
onImageError(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.src = 'https://via.placeholder.com/300x400?text=No+Image';
  }
}

}
