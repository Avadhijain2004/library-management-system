import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  
  static nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const nameRegex = /^[a-zA-Z\s]+$/;
      const valid = nameRegex.test(control.value) && control.value.trim().length >= 3;
      
      return valid ? null : { 
        invalidName: { 
          message: 'Name must be at least 3 characters long and contain only letters.' 
        } 
      };
    };
  }

  static passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const password = control.value;
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumeric = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      const isValidLength = password.length >= 8;
      
      const valid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar && isValidLength;
      
      return valid ? null : { 
        invalidPassword: { 
          message: 'Password must be at least 8 characters and include a mix of uppercase, lowercase, number, and special character.' 
        } 
      };
    };
  }

  static confirmPasswordValidator(passwordControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || !control.parent) return null;
      
      const password = control.parent.get(passwordControlName)?.value;
      const confirmPassword = control.value;
      
      return password === confirmPassword ? null : { 
        passwordMismatch: { 
          message: 'Passwords do not match.' 
        } 
      };
    };
  }

  static mobileNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const mobileRegex = /^[0-9]{8,10}$/;
      const valid = mobileRegex.test(control.value);
      
      return valid ? null : { 
        invalidMobile: { 
          message: 'Enter a valid mobile number.' 
        } 
      };
    };
  }

  static addressValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const valid = control.value.trim().length >= 10;
      
      return valid ? null : { 
        invalidAddress: { 
          message: 'Address must be at least 10 characters long.' 
        } 
      };
    };
  }

  static ageValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= 14 ? null : { 
        invalidAge: { 
          message: 'Member must be 18 years old to create account.' 
        } 
      };
    };
  }
}
