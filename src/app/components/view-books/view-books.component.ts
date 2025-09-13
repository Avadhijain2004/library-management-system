import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { BookService } from '../../services/book.service';
import { Book, SearchCriteria, SearchResult, BookCategory } from '../../models/book.model';
import { NavbarComponent } from '../navbar/navbar.component';

// Add these interfaces for the component
interface ExtendedSearchCriteria extends SearchCriteria {
  availabilityFilter?: 'all' | 'available' | 'unavailable';
  sortBy?: 'title' | 'author' | 'category' | 'rating' | 'publishYear';
  sortOrder?: 'asc' | 'desc';
}

interface AvailabilityInfo {
  status: 'Available' | 'Limited' | 'Unavailable' | 'Out of Stock';
  message: string;
  nextAvailableDate?: string;
}

@Component({
  selector: 'app-view-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NavbarComponent],
  templateUrl: './view-books.component.html',
  styleUrls: ['./view-books.component.css']
})
export class ViewBooksComponent implements OnInit, OnDestroy {
  searchForm!: FormGroup;
  searchResults: SearchResult | null = null;
  selectedBook: Book | null = null;
  showBookModal = false;
  showAvailabilityModal = false;
  availabilityInfo: AvailabilityInfo | null = null;
  categories: BookCategory[] = [];

  // States
  isSearching = false;
  hasSearched = false;
  
  // Search configuration
  searchTypes = [
    { value: 'all', label: 'All Fields' },
    { value: 'title', label: 'Title' },
    { value: 'author', label: 'Author' },
    { value: 'category', label: 'Category' },
    { value: 'bookId', label: 'Book ID' }
  ];

  sortOptions = [
    { value: 'title', label: 'Title' },
    { value: 'author', label: 'Author' },
    { value: 'category', label: 'Category' },
    { value: 'rating', label: 'Rating' },
    { value: 'publishYear', label: 'Publication Year' }
  ];

  private searchSubject = new Subject<ExtendedSearchCriteria>();
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private bookService: BookService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadCategories();
    this.handleRouteParams();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      query: [''],
      searchType: ['all'],
      category: [''],
      availabilityFilter: ['all'],
      sortBy: ['title'],
      sortOrder: ['asc']
    });
  }

  private setupSearch(): void {
    // Listen to form changes for real-time search
    this.subscriptions.add(
      this.searchForm.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      ).subscribe(() => {
        this.performSearch();
      })
    );

    // Handle search subject
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      ).subscribe(criteria => {
        this.executeSearch(criteria);
      })
    );
  }

  private loadCategories(): void {
    this.subscriptions.add(
      this.bookService.getBookCategories().subscribe(categories => {
        this.categories = categories;
      })
    );
  }

  private handleRouteParams(): void {
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        if (params['q']) {
          this.searchForm.patchValue({
            query: params['q'],
            searchType: params['searchType'] || 'all'
          });
          this.performSearch();
        } else {
          // Load all books initially
          this.performSearch();
        }
      })
    );
  }

  onSearch(): void {
    this.performSearch();
  }

  performSearch(): void {
    const formValue = this.searchForm.value;
    const criteria: ExtendedSearchCriteria = {};

    // Map form values to SearchCriteria based on searchType
    const query = formValue.query?.trim() || '';
    if (query) {
      switch (formValue.searchType) {
        case 'title':
          criteria.title = query;
          break;
        case 'author':
          criteria.author = query;
          break;
        case 'category':
          criteria.category = query;
          break;
        case 'bookId':
          criteria.bookId = query;
          break;
        case 'all':
        default:
          // For 'all' search, we'll search across all fields
          criteria.title = query;
          criteria.author = query;
          criteria.category = query;
          criteria.bookId = query;
          break;
      }
    }

    // Add category filter
    if (formValue.category && formValue.category.trim()) {
      criteria.category = formValue.category;
    }

    // Add other filters
    criteria.availabilityFilter = formValue.availabilityFilter;
    criteria.sortBy = formValue.sortBy;
    criteria.sortOrder = formValue.sortOrder;

    this.searchSubject.next(criteria);
  }

  private executeSearch(criteria: ExtendedSearchCriteria): void {
    this.isSearching = true;
    
    // Create basic SearchCriteria for the service
    const basicCriteria: SearchCriteria = {
      title: criteria.title,
      author: criteria.author,
      category: criteria.category,
      bookId: criteria.bookId
    };

    this.subscriptions.add(
      this.bookService.searchBooks(basicCriteria).subscribe({
        next: (result) => {
          // Apply additional filtering and sorting
          let filteredBooks = result.books;

          // Handle 'all' search type - search across all fields
          if (criteria.title && criteria.author && criteria.category && criteria.bookId) {
            const query = criteria.title.toLowerCase();
            filteredBooks = result.books.filter(book =>
              book.title.toLowerCase().includes(query) ||
              book.author.toLowerCase().includes(query) ||
              book.category.toLowerCase().includes(query) ||
              book.id.toLowerCase().includes(query)
            );
          }

          // Apply availability filter
          if (criteria.availabilityFilter && criteria.availabilityFilter !== 'all') {
            if (criteria.availabilityFilter === 'available') {
              filteredBooks = filteredBooks.filter(book => book.isAvailable && book.availableCopies > 0);
            } else if (criteria.availabilityFilter === 'unavailable') {
              filteredBooks = filteredBooks.filter(book => !book.isAvailable || book.availableCopies === 0);
            }
          }

          // Apply sorting
          if (criteria.sortBy) {
            filteredBooks = this.sortBooks(filteredBooks, criteria.sortBy, criteria.sortOrder || 'asc');
          }

          this.searchResults = {
            books: filteredBooks,
            totalCount: filteredBooks.length,
            searchTerm: result.searchTerm
          };

          this.hasSearched = true;
          this.isSearching = false;

          // Show availability popup for unavailable books
          if (filteredBooks.length === 0 && (criteria.title || criteria.author || criteria.category || criteria.bookId)) {
            this.showUnavailableMessage();
          }
        },
        error: () => {
          this.isSearching = false;
          this.hasSearched = true;
          this.searchResults = {
            books: [],
            totalCount: 0,
            searchTerm: 'Search Error'
          };
        }
      })
    );
  }

  private sortBooks(books: Book[], sortBy: string, sortOrder: string): Book[] {
    return books.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'author':
          aValue = a.author.toLowerCase();
          bValue = b.author.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'publishYear':
          aValue = a.publishYear || 0;
          bValue = b.publishYear || 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'desc' ? 
          bValue.localeCompare(aValue) : 
          aValue.localeCompare(bValue);
      } else {
        return sortOrder === 'desc' ? 
          bValue - aValue : 
          aValue - bValue;
      }
    });
  }

  onBookClick(book: Book): void {
    this.selectedBook = book;
    this.showBookModal = true;
  }

  onCheckAvailability(book: Book): void {
    this.availabilityInfo = this.getAvailabilityInfo(book);
    this.showAvailabilityModal = true;
  }

  private getAvailabilityInfo(book: Book): AvailabilityInfo {
    if (!book.isAvailable || book.availableCopies === 0) {
      // Calculate next available date (7-14 days from now)
      const nextAvailable = new Date();
      const daysUntilAvailable = book.dueDate ? 
        Math.ceil((new Date(book.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 7;
      nextAvailable.setDate(nextAvailable.getDate() + Math.max(daysUntilAvailable, 7));

      return {
        status: 'Unavailable',
        message: `This book is currently borrowed by another member and will be available after ${Math.max(daysUntilAvailable, 7)} days.`,
        nextAvailableDate: nextAvailable.toISOString()
      };
    } else if (book.availableCopies === 1) {
      return {
        status: 'Limited',
        message: `Only 1 copy remaining out of ${book.totalCopies} total copies.`
      };
    } else {
      return {
        status: 'Available',
        message: `${book.availableCopies} of ${book.totalCopies} copies available.`
      };
    }
  }

  onBorrowBook(book: Book): void {
    if (book.isAvailable && book.availableCopies > 0) {
      this.router.navigate(['/borrow'], { queryParams: { bookId: book.id } });
    } else {
      this.onCheckAvailability(book);
    }
  }

  clearSearch(): void {
    this.searchForm.reset({
      query: '',
      searchType: 'all',
      category: '',
      availabilityFilter: 'all',
      sortBy: 'title',
      sortOrder: 'asc'
    });
    this.performSearch();
  }

  closeModal(): void {
    this.showBookModal = false;
    this.showAvailabilityModal = false;
    this.selectedBook = null;
    this.availabilityInfo = null;
  }

  private showUnavailableMessage(): void {
    // This will be handled in the template when no results are found
    console.log('No books found matching the search criteria');
  }

  getAvailabilityClass(book: Book): string {
    if (!book.isAvailable || book.availableCopies === 0) {
      return 'availability-unavailable';
    } else if (book.availableCopies === 1) {
      return 'availability-limited';
    } else {
      return 'availability-available';
    }
  }

  getAvailabilityText(book: Book): string {
    if (!book.isAvailable || book.availableCopies === 0) {
      return 'Unavailable';
    } else if (book.availableCopies === 1) {
      return 'Limited';
    } else {
      return 'Available';
    }
  }

  getStarArray(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  getEmptyStarArray(rating: number): number[] {
    return Array(5 - Math.floor(rating)).fill(0);
  }

  hasHalfStar(rating: number): boolean {
    return rating % 1 !== 0;
  }

  trackByBookId(index: number, book: Book): string {
    return book.id;
  }

  navigateToCategory(categoryName: string): void {
    this.searchForm.patchValue({ 
      category: categoryName, 
      query: '',
      searchType: 'category'
    });
    this.performSearch();
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop';
    }
  }

  // Statistics for dashboard
  getTotalBooks(): number {
    return this.searchResults?.books?.length || 0;
  }

  getAvailableBooks(): number {
    return this.searchResults?.books?.filter(book => book.isAvailable && book.availableCopies > 0)?.length || 0;
  }

  getUnavailableBooks(): number {
    return this.searchResults?.books?.filter(book => !book.isAvailable || book.availableCopies === 0)?.length || 0;
  }
}
