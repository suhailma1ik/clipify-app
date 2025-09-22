import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { AuthManager } from '../AuthManager';

// Mock the useAuth hook
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockClearError = vi.fn();
const mockGetAccessToken = vi.fn();
const mockHasValidAccessToken = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/useAuth';
const mockUseAuth = vi.mocked(useAuth);

describe('AuthManager', () => {
  const defaultAuthState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
    login: mockLogin,
    logout: mockLogout,
    clearError: mockClearError,
    getAccessToken: mockGetAccessToken,
    hasValidAccessToken: mockHasValidAccessToken,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockLogin.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
    mockGetAccessToken.mockResolvedValue(null);
    mockHasValidAccessToken.mockResolvedValue(false);
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<AuthManager />);
      
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<AuthManager className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render compact view when compact prop is true', () => {
      render(<AuthManager compact />);
      
      expect(screen.queryByText('Authentication')).not.toBeInTheDocument();
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('should show unauthenticated state correctly', () => {
      render(<AuthManager />);
      
      expect(screen.getByText('🔴')).toBeInTheDocument();
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      expect(screen.getByText('Login with Browser')).toBeInTheDocument();
    });

    it('should show authenticated state correctly', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
      });

      render(<AuthManager />);
      
      expect(screen.getByText('🟢')).toBeInTheDocument();
      expect(screen.getByText('Authenticated')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should show loading state correctly', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      render(<AuthManager />);
      
      expect(screen.getByText('⏳')).toBeInTheDocument();
      expect(screen.getByText('Processing authentication...')).toBeInTheDocument();
    });

    it('should show error state correctly', () => {
      const errorMessage = 'Authentication failed';
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        error: errorMessage,
      });

      render(<AuthManager />);
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should show compact authenticated state', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
      });

      render(<AuthManager compact />);
      
      expect(screen.getByText('🟢')).toBeInTheDocument();
      expect(screen.getByText('Authenticated')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('should show compact unauthenticated state', () => {
      render(<AuthManager compact />);
      
      expect(screen.getByText('🔴')).toBeInTheDocument();
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('should show loading indicator in compact mode', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      render(<AuthManager compact />);
      
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('should hide buttons when loading in compact mode', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
        isAuthenticated: true,
      });

      render(<AuthManager compact />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('User Information', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
    };

    it('should display user info when authenticated and showUserInfo is true', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser,
      });

      render(<AuthManager showUserInfo />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByAltText('User avatar')).toBeInTheDocument();
    });

    it('should hide user info when showUserInfo is false', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser,
      });

      render(<AuthManager showUserInfo={false} />);
      
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });

    it('should show user initials when no avatar is provided', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: { ...mockUser, avatar: undefined },
      });

      render(<AuthManager />);
      
      expect(screen.getByText('T')).toBeInTheDocument();
      expect(screen.queryByAltText('User avatar')).not.toBeInTheDocument();
    });

    it('should show default icon when no name is provided', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' }, // Remove name property entirely
      });

      render(<AuthManager showUserInfo />);
      
      // The component shows the user's first initial or 👤 if no name
      // Since name is not provided, it should show 👤
      const userIcon = screen.getByText('👤');
      expect(userIcon).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should call login when login button is clicked', async () => {
      render(<AuthManager />);
      
      const loginButton = screen.getByText('Login with Browser');
      fireEvent.click(loginButton);
      
      expect(mockLogin).toHaveBeenCalledOnce();
    });

    it('should call logout when logout button is clicked', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
      });

      render(<AuthManager />);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledOnce();
    });

    it('should call clearError when error close button is clicked', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        error: 'Test error',
      });

      render(<AuthManager />);
      
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      
      expect(mockClearError).toHaveBeenCalledOnce();
    });

    it('should disable login button when loading', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      render(<AuthManager />);
      
      const loginButton = screen.getByRole('button');
      expect(loginButton).toBeDisabled();
    });

    it('should disable logout button when loading', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        isLoading: true,
      });

      render(<AuthManager />);
      
      const logoutButton = screen.getByRole('button');
      expect(logoutButton).toBeDisabled();
    });
  });

  describe('Button Text States', () => {
    it('should show "Opening browser..." when loading and not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      render(<AuthManager />);
      
      expect(screen.getByText('Opening browser...')).toBeInTheDocument();
    });

    it('should show "Logging out..." when loading and authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        isLoading: true,
      });

      render(<AuthManager />);
      
      expect(screen.getByText('Logging out...')).toBeInTheDocument();
    });
  });

  describe('Help Section', () => {
    it('should render help section with instructions', () => {
      render(<AuthManager />);
      
      expect(screen.getByText('How does authentication work?')).toBeInTheDocument();
      expect(screen.getByText(/Click "Login with Browser"/)).toBeInTheDocument();
      expect(screen.getByText(/Complete authentication in the browser/)).toBeInTheDocument();
      expect(screen.getByText(/The browser will redirect back/)).toBeInTheDocument();
      expect(screen.getByText(/Your authentication will be securely stored/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle login errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLogin.mockRejectedValue(new Error('Login failed'));

      render(<AuthManager />);
      
      const loginButton = screen.getByText('Login with Browser');
      fireEvent.click(loginButton);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle logout errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLogout.mockRejectedValue(new Error('Logout failed'));
      
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
      });

      render(<AuthManager />);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});