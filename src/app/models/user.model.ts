export interface UserBorrowInfo {
  libraryId: string;
  name: string;
  email: string;
  currentBorrowedCount: number;
  maxBooksAllowed: number;
  fines: number;
  overdueBooks: number;
  isEligible: boolean;
  borrowHistory?: BorrowedBook[];
}

export interface BorrowedBook {
  bookId: string;
  bookTitle: string;
  borrowDate: Date;
  dueDate: Date;
  isOverdue: boolean;
  fineAmount?: number;
}

