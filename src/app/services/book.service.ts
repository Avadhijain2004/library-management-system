import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Book, SearchCriteria, SearchResult, BookCategory } from '../models/book.model';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = 'http://localhost:8080/api/books';
  
  // Mock comprehensive book database
  private mockBooks: Book[] = [
    {
      id: 'BK001',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      category: 'Classic Literature',
      isbn: '978-0-7432-7356-5',
      description: 'A classic American novel set in the Jazz Age',
      imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
      availableCopies: 3,
      totalCopies: 10,
      rating: 4.5,
      publishYear: 1925,
      isAvailable: true,
      borrowedBy: ['user1', 'user2'],
      returnDate: '2025-09-20',
      
    },
    {
      id: 'BK002',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      category: 'Classic Literature',
      isbn: '978-0-06-112008-4',
      description: 'A gripping tale of racial injustice and childhood innocence',
      imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
      availableCopies: 0,
      totalCopies: 8,
      rating: 4.8,
      publishYear: 1960,
      isAvailable: true,
      borrowedBy: ['user3', 'user4', 'user5'],
      dueDate: '2025-09-13'
    },
    {
      id: 'BK003',
      title: '1984',
      author: 'George Orwell',
      category: 'Dystopian Fiction',
      isbn: '978-0-452-28423-4',
      description: 'A dystopian social science fiction novel',
      imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=400&fit=crop',
      availableCopies: 5,
      totalCopies: 12,
      rating: 4.6,
      publishYear: 1949,
      isAvailable: true
    },
    {
      id: 'BK004',
      title: 'Angular Complete Guide',
      author: 'John Smith',
      category: 'Programming',
      isbn: '978-1-234-56789-0',
      description: 'Complete guide to Angular development',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
      availableCopies: 8,
      totalCopies: 10,
      rating: 4.7,
      publishYear: 2023,
      isAvailable: true
    },
    {
      id: 'BK005',
      title: 'JavaScript: The Good Parts',
      author: 'Douglas Crockford',
      category: 'Programming',
      isbn: '978-0-596-51774-8',
      description: 'Essential JavaScript programming concepts',
      imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=400&fit=crop',
      availableCopies: 2,
      totalCopies: 6,
      rating: 4.4,
      publishYear: 2008,
      isAvailable: true
    },
    {
      id: 'BK006',
      title: 'Out of Stock Book',
      author: 'Test Author',
      category: 'Fiction',
      isbn: '978-0-000-00000-0',
      description: 'This book is currently unavailable',
      imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop',
      availableCopies: 0,
      totalCopies: 5,
      rating: 3.8,
      publishYear: 2020,
      isAvailable: false
    }
  ];

  constructor() {}

  searchBooks(criteria: SearchCriteria): Observable<SearchResult> {
    console.log('Searching books with criteria:', criteria);
    
    let filteredBooks = this.mockBooks;

    // Filter by author
    if (criteria.author && criteria.author.trim()) {
      const authorQuery = criteria.author.toLowerCase().trim();
      filteredBooks = filteredBooks.filter(book =>
        book.author.toLowerCase().includes(authorQuery)
      );
    }

    // Filter by title
    if (criteria.title && criteria.title.trim()) {
      const titleQuery = criteria.title.toLowerCase().trim();
      filteredBooks = filteredBooks.filter(book =>
        book.title.toLowerCase().includes(titleQuery)
      );
    }

    // Filter by category
    if (criteria.category && criteria.category.trim()) {
      const categoryQuery = criteria.category.toLowerCase().trim();
      filteredBooks = filteredBooks.filter(book =>
        book.category.toLowerCase().includes(categoryQuery)
      );
    }

    // Filter by book ID
    if (criteria.bookId && criteria.bookId.trim()) {
      const idQuery = criteria.bookId.toUpperCase().trim();
      filteredBooks = filteredBooks.filter(book =>
        book.id.toUpperCase().includes(idQuery)
      );
    }

    const result: SearchResult = {
      books: filteredBooks,
      totalCount: filteredBooks.length,
      searchTerm: this.generateSearchTerm(criteria)
    };

    console.log('Search results:', result);
    return of(result).pipe(delay(300)); // Simulate network delay
  }

  getBookCategories(): Observable<BookCategory[]> {
    const categories = this.mockBooks.reduce((acc, book) => {
      const existing = acc.find(cat => cat.name === book.category);
      if (existing) {
        existing.count++;
      } else {
        acc.push({
          id: book.category.toLowerCase().replace(/\s+/g, '-'),
          name: book.category,
          count: 1
        });
      }
      return acc;
    }, [] as BookCategory[]);

    return of(categories).pipe(delay(100));
  }

  getBookById(id: string): Observable<Book | null> {
    const book = this.mockBooks.find(b => b.id === id);
    return of(book || null).pipe(delay(200));
  }

  private generateSearchTerm(criteria: SearchCriteria): string {
    const terms: string[] = [];
    if (criteria.author) terms.push(`Author: ${criteria.author}`);
    if (criteria.title) terms.push(`Title: ${criteria.title}`);
    if (criteria.category) terms.push(`Category: ${criteria.category}`);
    if (criteria.bookId) terms.push(`ID: ${criteria.bookId}`);
    return terms.join(', ') || 'All Books';
  }

  // Get popular books (from existing method)
  getPopularBooks(): Observable<Book[]> {
    return of(this.mockBooks.filter(book => book.rating && book.rating > 4.0)).pipe(delay(500));
  }
}
