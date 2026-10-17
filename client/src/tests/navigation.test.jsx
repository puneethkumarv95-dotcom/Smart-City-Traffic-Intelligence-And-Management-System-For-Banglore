import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { RoleGuard } from '../components/common/RoleGuard';
import { Sidebar } from '../components/layout/Sidebar';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Activity } from 'lucide-react';

let mockAuth = {
  user: { name: 'Officer Arjun', role: 'police' },
  isAuthenticated: true,
  isLoading: false,
  logout: vi.fn()
};

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: () => mockAuth
}));

vi.mock('../store/useUIStore', () => ({
  useUIStore: () => ({
    mobileSidebarOpen: false,
    setMobileSidebarOpen: vi.fn(),
    toggleMobileSidebar: vi.fn()
  })
}));

describe('Navigation & Component Testing', () => {
  describe('RoleGuard', () => {
    it('allows access when user has an allowed role', () => {
      mockAuth = {
        user: { name: 'Officer Arjun', role: 'police' },
        isAuthenticated: true,
        isLoading: false
      };

      render(
        <MemoryRouter initialEntries={['/police']}>
          <RoleGuard allowedRoles={['police', 'admin']}>
            <div data-testid="protected-content">Police Dashboard Content</div>
          </RoleGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Police Dashboard Content')).toBeInTheDocument();
    });

    it('blocks access and displays Restricted Access if role is unauthorized', () => {
      mockAuth = {
        user: { name: 'Ramesh Citizen', role: 'citizen' },
        isAuthenticated: true,
        isLoading: false
      };

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <RoleGuard allowedRoles={['admin']}>
            <div data-testid="protected-content">Admin Only</div>
          </RoleGuard>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByText(/Restricted Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Return to Your Portal/i)).toBeInTheDocument();
    });

    it('displays loading spinner when auth status is verifying', () => {
      mockAuth = {
        user: null,
        isAuthenticated: false,
        isLoading: true
      };

      render(
        <MemoryRouter initialEntries={['/citizen']}>
          <RoleGuard allowedRoles={['citizen']}>
            <div>Content</div>
          </RoleGuard>
        </MemoryRouter>
      );

      expect(screen.getByText(/Verifying security clearances\.\.\./i)).toBeInTheDocument();
    });
  });

  describe('Sidebar Role Adaptation', () => {
    it('renders police navigation links when user role is police', () => {
      mockAuth = {
        user: { name: 'Officer Arjun', role: 'police' },
        isAuthenticated: true,
        isLoading: false
      };

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      expect(screen.getByText('Traffic Police')).toBeInTheDocument();
      expect(screen.getByText('Road Closures')).toBeInTheDocument();
      expect(screen.getByText('Incident Review')).toBeInTheDocument();
    });

    it('renders citizen navigation links when user role is citizen', () => {
      mockAuth = {
        user: { name: 'Deepa Citizen', role: 'citizen' },
        isAuthenticated: true,
        isLoading: false
      };

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      expect(screen.getByText('Citizen Commuter')).toBeInTheDocument();
      expect(screen.getByText('Report Incident')).toBeInTheDocument();
      expect(screen.getByText('Saved Commutes')).toBeInTheDocument();
    });
  });

  describe('UI Design System (Badge & StatCard)', () => {
    it('renders Badge with correct variant styling', () => {
      const { rerender } = render(<Badge variant="critical">Critical Hazard</Badge>);
      expect(screen.getByText('Critical Hazard')).toBeInTheDocument();
      expect(screen.getByText('Critical Hazard')).toHaveClass('animate-pulse');

      rerender(<Badge variant="success">Resolved</Badge>);
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('renders StatCard with title, value, and trend', () => {
      render(
        <StatCard
          title="Active Hotspots"
          value="14"
          subtitle="Updated real-time"
          trend="+3"
          icon={Activity}
          color="cyan"
        />
      );

      expect(screen.getByText('Active Hotspots')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('+3')).toBeInTheDocument();
      expect(screen.getByText('Updated real-time')).toBeInTheDocument();
    });
  });
});

