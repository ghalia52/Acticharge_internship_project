import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import './Login.css';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  
  // State management
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginStatus, setLoginStatus] = useState(null);

  // Configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || '${process.env.REACT_APP_API_URL}';

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
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Store user data in React state for dashboard
// Store user data in sessionStorage for dashboard
const storeUserData = (userData) => {
  // Store user data for the dashboard component
  const userInfo = {
    id: userData.id,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    email: userData.email || '',
    fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'User',
    createdAt: userData.createdAt,
    lastLogin: userData.lastLogin,
    loginCount: userData.loginCount
  };

  // Store in sessionStorage so dashboard can access it
  sessionStorage.setItem('user', JSON.stringify(userInfo));
  
  console.log('User data stored in sessionStorage:', userInfo);

  // Navigate to dashboard
  navigate('/dashboard');
};

  // Login handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setLoginStatus(null);
    setErrors({});
    
    try {
      console.log('Attempting login to:', `${API_BASE_URL}/api/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      console.log('Login response status:', response.status);

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.log('Login error data:', errorData);
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage;
        }
        
        // Handle different error cases
        if (response.status === 401) {
          setErrors({ general: errorMessage || 'Invalid email or password' });
        } else if (response.status === 400) {
          setErrors({ general: errorMessage || 'Please check your email and password' });
        } else if (response.status === 500) {
          setErrors({ general: 'Server error. Please try again later.' });
        } else {
          setErrors({ general: errorMessage });
        }
        setLoginStatus('error');
        return;
      }

      const data = await response.json();
      console.log('Login successful:', data);
      
      if (!data.user) {
        throw new Error('No user data received from server');
      }
      
      setLoginStatus('success');
      
      // Store user data and redirect
      setTimeout(() => {
        storeUserData(data.user);
      }, 1500);
        
    } catch (error) {
      console.error('Login error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setErrors({ general: `Cannot connect to server at ${API_BASE_URL}. Please check if the server is running.` });
      } else if (error.message.includes('user data')) {
        setErrors({ general: 'Invalid response from server. Please try again.' });
      } else {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      }
      setLoginStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup navigation
  const handleSignUp = () => {
    navigate('/register');
  };

  // Removed the useEffect that was trying to call /api/auth/verify
  // since that endpoint doesn't exist in your backend

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Header */}
        <header className="login-header">
          <div className="login-header__brand">
            <div className="login-header__logo-icons">
              <img src="/act_logo.png" alt="Logo" className="logo" />
            </div>
            
            <div className="login-header__text">
              <h1 className="login-header__title">ActiCharge</h1>
              <p className="login-header__subtitle">Sign in to your dashboard</p>
            </div>
          </div>
        </header>

        {/* Login Form */}
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
            {loginStatus === 'success' && (
              <div className="alert alert--success">
                <CheckCircle className="alert__icon" size={16} />
                <span className="alert__text">Login successful! Redirecting to dashboard...</span>
              </div>
            )}

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
                placeholder="Enter your email"
                disabled={isLoading}
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
                  placeholder="Enter your password"
                  disabled={isLoading}
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

            {/* Remember Me  */}
            <div className="form-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="checkbox__input"
                  disabled={isLoading}
                />
                <span className="checkbox__label">Remember me</span>
              </label>
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
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="footer">
          <p className="footer__text">
            Don't have an account?{' '}
            <button 
              type="button"
              onClick={handleSignUp}
              disabled={isLoading}
              className="footer__signup-button"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;