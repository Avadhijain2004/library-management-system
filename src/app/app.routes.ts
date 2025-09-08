import { Routes } from '@angular/router';
import { MemberRegistrationComponent } from './components/member-registration/member-registration.component';
import { LoginComponent } from './components/login/login.component';
import { HomepageComponent } from './components/homepage/homepage.component';
import { SearchBooksComponent } from './components/search-books/search-books.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: MemberRegistrationComponent },
  { path: 'homepage', component: HomepageComponent },
  { path: 'search', component: SearchBooksComponent },
  { path: 'books', component: SearchBooksComponent },
  // Add more routes here as you create more components
];
