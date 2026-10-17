import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Mock AuthStore
vi.mock('../store/useAuthStore', () => ({
  useAuthStore: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue({ success: true, user: { role: 'citizen' } }),
    register: vi.fn().mockResolvedValue({ success: true, user: { role: 'citizen' } }),
    logout: vi.fn()
  })
}));

describe('Auth Pages (Frontend Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginPage', () => {
    it('renders the login form and elements correctly', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Bengaluru Smart City Transit/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/officer@smartcity\.gov/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Authenticate & Enter/i })).toBeInTheDocument();
    });

    it('renders 5 quick demo role access buttons', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/One-Click Evaluator Demo Logins/i)).toBeInTheDocument();
      expect(screen.getByText('Citizen')).toBeInTheDocument();
      expect(screen.getByText('Traffic Police')).toBeInTheDocument();
      expect(screen.getByText('Emergency EMS')).toBeInTheDocument();
      expect(screen.getByText('Parking Operator')).toBeInTheDocument();
      expect(screen.getByText('Super Administrator')).toBeInTheDocument();
    });

    it('allows typing email and password into input fields', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByPlaceholderText(/officer@smartcity\.gov/i);
      const passwordInput = screen.getByPlaceholderText('••••••••••••');

      fireEvent.change(emailInput, { target: { value: 'citizen@smartcity.gov' } });
      fireEvent.change(passwordInput, { target: { value: 'Password@123' } });

      expect(emailInput.value).toBe('citizen@smartcity.gov');
      expect(passwordInput.value).toBe('Password@123');
    });
  });

  describe('RegisterPage', () => {
    it('renders the registration form with input fields', () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Citizen Registration/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Kavitha Reddy/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/kavitha@example\.com/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Citizen Account/i })).toBeInTheDocument();
    });

    it('updates registration form state on input', () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );

      const nameInput = screen.getByPlaceholderText(/Kavitha Reddy/i);
      const emailInput = screen.getByPlaceholderText(/kavitha@example\.com/i);

      fireEvent.change(nameInput, { target: { value: 'Priya Sharma' } });
      fireEvent.change(emailInput, { target: { value: 'priya@example.com' } });

      expect(nameInput.value).toBe('Priya Sharma');
      expect(emailInput.value).toBe('priya@example.com');
    });
  });
});

