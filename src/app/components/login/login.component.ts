import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showForgotPassword = false;
  forgotPasswordEmail = '';
  forgotPasswordMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private memberService: MemberService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/homepage']);
    }
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  // DEBUG METHODS
  clearAllData(): void {
    localStorage.clear();
    console.log('All localStorage data cleared');
    this.errorMessage = 'All data cleared. Please register again.';
  }

  showAllUsers(): void {
    const users = this.memberService.getRegisteredUsers();
    console.log('All registered users:', users);
    
    if (users.length === 0) {
      this.errorMessage = 'No users registered. Please register first.';
    } else {
      this.errorMessage = `Found ${users.length} registered user(s). Check console for details.`;
    }
  }

  testLogin(): void {
    const email = this.loginForm.value.email;
    const password = this.loginForm.value.password;
    
    console.log('Testing login for:', email);
    
    const user = this.memberService.findUserByEmail(email);
    console.log('Found user:', user);
    
    if (user) {
      const isValid = this.memberService.validateCredentials(email, password);
      console.log('Credentials valid:', isValid);
      
      if (isValid) {
        this.errorMessage = 'Credentials are valid! Proceeding with login...';
        this.proceedWithLogin();
      } else {
        this.errorMessage = 'Password does not match. Check console for details.';
      }
    } else {
      this.errorMessage = 'User not found. Please register first.';
    }
  }

  private proceedWithLogin(): void {
  const credentials: LoginRequest = {
    email: this.loginForm.value.email.trim().toLowerCase(),
    password: this.loginForm.value.password
  };

  const user = this.memberService.findUserByEmail(credentials.email);
  if (user) {
    const authUser = {
      memberId: user.id,
      memberName: user.memberName,
      email: user.email,
      token: 'demo-token-' + Date.now(),
      loginTime: new Date()
    };

    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(authUser));
    console.log('✅ User data saved to localStorage:', authUser);
    
    // Update AuthService currentUser subject
    this.authService.setCurrentUser(authUser);
    
    console.log('✅ Navigating to homepage...');
    this.router.navigate(['/homepage']);
  }
}


  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required.`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address.';
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      email: 'Email',
      password: 'Password'
    };
    return displayNames[fieldName] || fieldName;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.testLogin(); // Use test login for now
    } else {
      this.markFormGroupTouched();
    }
  }

  onForgotPassword(): void {
    this.showForgotPassword = true;
    this.forgotPasswordEmail = this.loginForm.value.email || '';
  }

  submitForgotPassword(): void {
    this.forgotPasswordMessage = 'Password reset functionality will be implemented later.';
  }

  closeForgotPassword(): void {
    this.showForgotPassword = false;
    this.forgotPasswordEmail = '';
    this.forgotPasswordMessage = '';
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  get isFormValid(): boolean {
    return this.loginForm.valid;
  }
}
