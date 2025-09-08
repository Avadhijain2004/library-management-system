import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BorrowBooksComponent } from './borrow-books.component';

describe('BorrowBooksComponent', () => {
  let component: BorrowBooksComponent;
  let fixture: ComponentFixture<BorrowBooksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BorrowBooksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BorrowBooksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
