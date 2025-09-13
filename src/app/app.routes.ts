import { Routes } from '@angular/router';
import { MemberRegistrationComponent } from './components/member-registration/member-registration.component';
import { LoginComponent } from './components/login/login.component';
import { HomepageComponent } from './components/homepage/homepage.component';
import { SearchBooksComponent } from './components/search-books/search-books.component';
import { BorrowBooksComponent } from './components/borrow-books/borrow-books.component';
import { ViewBooksComponent } from './components/view-books/view-books.component';
import { DonateBooksComponent } from './components/donate-books/donate-books.component';
import { ComplaintsComponent } from './components/complaints/complaints.component';
import { ProfileComponent } from './components/profile/profile.component';
import { MyBooksComponent } from './components/my-books/my-books.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: MemberRegistrationComponent },
  { path: 'homepage', component: HomepageComponent },
  { path: 'search', component: BorrowBooksComponent },
  { path: 'borrow', component: BorrowBooksComponent }, 
  { path: 'view', component: ViewBooksComponent }, 
  
  { path: 'donate', component: DonateBooksComponent },
  { path: 'complaints', component: ComplaintsComponent },
  { path: 'profile', component: ProfileComponent},
  { path: 'borrowed-returned', component: MyBooksComponent},

];
