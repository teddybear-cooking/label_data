// Client-side auth check
export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('auth_token');
  return !!token;
}

// Client-side redirect to login
export function redirectToLogin(returnUrl) {
  if (typeof window !== 'undefined') {
    const loginUrl = `/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`;
    window.location.href = loginUrl;
  }
}

// Server-side auth check for API routes
export function checkAuthHeader(request) {
  const authHeader = request.headers.get('Authorization');
  return authHeader && authHeader.startsWith('Bearer ');
}

// Get token from localStorage (client-side only)
export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// Logout function
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  }
} 