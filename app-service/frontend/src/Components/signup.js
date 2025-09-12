import React, { useState } from 'react';
import { Battery, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import './signup.css';

const SignUp = () => {
  // Mock navigate function - replace with your actual navigation logic
  const navigate = (path, options = {}) => {
    console.log('Navigate to:', path, 'with options:', options);
    // For React Router: import { useNavigate } from 'react-router-dom'; const navigate = useNavigate();
    // Replace this with your actual router navigation
    if (path === '/login') {
      window.location.href = '/login'; // or use your routing method
    }
  };
  
  // State management
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [signupStatus, setSignupStatus] = useState(null);

  // Configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://acticharge-drh3g9afcng6ckgw.francecentral-01.azurewebsites.net';

  // Event handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Clear general error when any field changes
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  // Form validation - Updated to match backend requirements (6 chars minimum)
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      // Updated to match backend validation (6 characters minimum)
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sign up handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setSignupStatus(null);
    setErrors({});
    
    try {
      console.log('Attempting registration with:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        // Don't log password for security
      });

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      console.log('Response status:', response.status);

      // Handle response
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 400) {
          setErrors({ general: responseData.message || 'Registration failed. Please check your input.' });
        } else if (response.status === 500) {
          setErrors({ general: 'Server error. Please try again later.' });
        } else {
          setErrors({ general: responseData.message || 'Registration failed. Please try again.' });
        }
        setSignupStatus('error');
        return;
      }

      // Success case
      setSignupStatus('success');
      console.log('Registration successful:', responseData);
      
      // Show success message and redirect
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Account created successfully! Please login with your credentials.',
            email: formData.email 
          }
        });
      }, 2000);
        
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setErrors({ 
          general: 'Cannot connect to server. Please check if the server is running on http://localhost:5000' 
        });
      } else if (error.message === 'Invalid response from server') {
        setErrors({ general: 'Server returned an invalid response. Please try again.' });
      } else {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      }
      setSignupStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign in redirect
  const handleSignIn = () => {
    navigate('/login');
  };

  // Handle terms and conditions
  const handleTermsClick = () => {
    console.log('Opening Terms and Conditions...');
    alert('Terms and Conditions would be displayed here');
  };

  // Handle privacy policy
  const handlePrivacyClick = () => {
    console.log('Opening Privacy Policy...');
    alert('Privacy Policy would be displayed here');
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        {/* Header */}
        <header className="signup-header">
          <div className="signup-header__brand">
            <div className="signup-header__logo">
              <Battery />
            </div>
            <div className="signup-header__text">
              <h1 className="signup-header__title">ActiCharge</h1>
              <p className="signup-header__subtitle">Create your account</p>
            </div>
          </div>
        </header>

        {/* Sign Up Form */}
        <form className="form-container" onSubmit={handleSubmit}>
          <div className="form-content">
            {/* General Error */}
            {errors.general && (
              <div className="alert alert--error">
                <AlertCircle className="alert__icon" size={16} />
                <span className="alert__text">{errors.general}</span>
              </div>
            )}

            {/* Success Message */}
            {signupStatus === 'success' && (
              <div className="alert alert--success">
                <CheckCircle className="alert__icon" size={16} />
                <span className="alert__text">
                  Account created successfully! Redirecting to login...
                </span>
              </div>
            )}

            {/* Name Fields Row */}
            <div className="name-fields-row">
              {/* First Name Field */}
              <div className="form-field">
                <label htmlFor="firstName" className="form-field__label">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`form-field__input ${errors.firstName ? 'form-field__input--error' : ''}`}
                  placeholder="John"
                  disabled={isLoading}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <div className="form-field__error">
                    <AlertCircle size={12} className="form-field__error-icon" />
                    <span>{errors.firstName}</span>
                  </div>
                )}
              </div>

              {/* Last Name Field */}
              <div className="form-field">
                <label htmlFor="lastName" className="form-field__label">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`form-field__input ${errors.lastName ? 'form-field__input--error' : ''}`}
                  placeholder="Doe"
                  disabled={isLoading}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <div className="form-field__error">
                    <AlertCircle size={12} className="form-field__error-icon" />
                    <span>{errors.lastName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="form-field">
              <label htmlFor="email" className="form-field__label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`form-field__input ${errors.email ? 'form-field__input--error' : ''}`}
                placeholder="john.doe@example.com"
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <div className="form-field__error">
                  <AlertCircle size={12} className="form-field__error-icon" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="form-field">
              <label htmlFor="password" className="form-field__label">
                Password
              </label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`form-field__input password-field__input ${errors.password ? 'form-field__input--error' : ''}`}
                  placeholder="Create a password (min. 6 characters)"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-field__toggle"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <div className="form-field__error">
                  <AlertCircle size={12} className="form-field__error-icon" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="form-field">
              <label htmlFor="confirmPassword" className="form-field__label">
                Confirm Password
              </label>
              <div className="password-field">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`form-field__input password-field__input ${errors.confirmPassword ? 'form-field__input--error' : ''}`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-field__toggle"
                  disabled={isLoading}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="form-field__error">
                  <AlertCircle size={12} className="form-field__error-icon" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="terms-agreement">
              <label className="terms-agreement__label">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="terms-agreement__checkbox"
                  disabled={isLoading}
                />
                <span className="terms-agreement__text">
                  I agree to the{' '}
                  <button
                    type="button"
                    className="terms-agreement__link"
                    disabled={isLoading}
                    onClick={handleTermsClick}
                  >
                    Terms and Conditions
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    className="terms-agreement__link"
                    disabled={isLoading}
                    onClick={handlePrivacyClick}
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
              {errors.agreeToTerms && (
                <div className="form-field__error">
                  <AlertCircle size={12} className="form-field__error-icon" />
                  <span>{errors.agreeToTerms}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`submit-button ${isLoading ? 'submit-button--loading' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="footer">
          <p className="footer__text">
            Already have an account?{' '}
            <button 
              onClick={handleSignIn}
              disabled={isLoading}
              className="footer__signin-button"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;