import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MemberService } from '../../services/member.service';
import { CustomValidators } from '../../validators/custom-validators';
import { 
  MemberRegistrationRequest, 
  MemberRegistrationResponse, 
  CountryCode 
} from '../../models/member.model';

@Component({
  selector: 'app-member-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './member-registration.component.html',
  styleUrls: ['./member-registration.component.css']
})
export class MemberRegistrationComponent implements OnInit {
  registrationForm!: FormGroup;
  countryCodes: CountryCode[] = [];
  isLoading = false;
  showSuccessModal = false;
  registrationResponse: MemberRegistrationResponse | null = null;
  maxDate: string = '';
  
  secretQuestions = [
    'What is your birth place?',
    'What is your pet\'s name?',
    'What is your mother\'s maiden name?',
    'What was your first school name?',
    'What is your favorite book?',
    'What is your childhood nickname?'
  ];

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private router: Router
  ) {
    this.initForm();
    this.setMaxDate();
  }

  ngOnInit(): void {
    this.countryCodes = this.memberService.getCountryCodes();
  }

  private initForm(): void {
    this.registrationForm = this.fb.group({
      memberName: ['', [Validators.required, CustomValidators.nameValidator()]],
      email: ['', [Validators.required, Validators.email]],
      countryCode: ['+91', [Validators.required]],
      mobileNumber: ['', [Validators.required, CustomValidators.mobileNumberValidator()]],
      address: ['', [Validators.required, CustomValidators.addressValidator()]],
      dateOfBirth: ['', [Validators.required, CustomValidators.ageValidator()]],
      password: ['', [Validators.required, CustomValidators.passwordValidator()]],
      confirmPassword: ['', [Validators.required, CustomValidators.confirmPasswordValidator('password')]],
      secretQuestion: ['', [Validators.required]],
      secretAnswer: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.registrationForm.get('password')?.valueChanges.subscribe(() => {
      this.registrationForm.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  private setMaxDate(): void {
    const today = new Date();
    const minAge = 14;
    const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    this.maxDate = maxDate.toISOString().split('T')[0];
  }

  getFieldError(fieldName: string): string {
    const field = this.registrationForm.get(fieldName);
    if (field && field.errors && field.touched) {
      const error = Object.keys(field.errors)[0];
      return field.errors[error]?.message || `Invalid ${fieldName}`;
    }
    return '';
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading = true;
      
      const registrationData: MemberRegistrationRequest = {
        memberName: this.registrationForm.value.memberName.trim(),
        email: this.registrationForm.value.email.trim().toLowerCase(),
        countryCode: this.registrationForm.value.countryCode,
        mobileNumber: this.registrationForm.value.mobileNumber,
        address: this.registrationForm.value.address.trim(),
        dateOfBirth: this.registrationForm.value.dateOfBirth,
        password: this.registrationForm.value.password,
        secretQuestion: this.registrationForm.value.secretQuestion,
        secretAnswer: this.registrationForm.value.secretAnswer.trim()
      };

      // Debug log
      console.log('Registering user with data:', registrationData);

      this.memberService.registerMember(registrationData).subscribe({
        next: (response) => {
          console.log('Registration response:', response);
          this.registrationResponse = response;
          this.showSuccessModal = true;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Registration failed:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onReset(): void {
    this.registrationForm.reset();
    this.registrationForm.patchValue({
      countryCode: '+91'
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key => {
      const control = this.registrationForm.get(key);
      control?.markAsTouched();
    });
  }

  get isFormValid(): boolean {
    return this.registrationForm.valid;
  }
}
