/**
 * DineVault Admin Client Script for Cloudflare Pages
 */

function getAuthToken() {
  const token = sessionStorage.getItem('dinevault_admin_token');
  const loginTime = sessionStorage.getItem('dinevault_admin_time');

  // Also clean up any legacy permanent localStorage tokens from earlier versions
  if (localStorage.getItem('dinevault_admin_token')) {
    localStorage.removeItem('dinevault_admin_token');
  }

  if (!token || !loginTime) {
    return null;
  }

  // Session expires after 2 hours (2 * 60 * 60 * 1000 ms)
  const maxSessionDuration = 2 * 60 * 60 * 1000;
  if (Date.now() - parseInt(loginTime, 10) > maxSessionDuration) {
    clearAuthToken();
    return null;
  }

  return token;
}

function setAuthToken(token) {
  sessionStorage.setItem('dinevault_admin_token', token);
  sessionStorage.setItem('dinevault_admin_time', Date.now());
  localStorage.removeItem('dinevault_admin_token');
}

function clearAuthToken() {
  sessionStorage.removeItem('dinevault_admin_token');
  sessionStorage.removeItem('dinevault_admin_time');
  localStorage.removeItem('dinevault_admin_token');
}

function requireAuth() {
  const token = getAuthToken();
  if (!token) {
    clearAuthToken();
    window.location.href = '/admin/index.html';
    return false;
  }
  return true;
}

function authHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global logout
function adminLogout() {
  clearAuthToken();
  window.location.href = '/admin/index.html';
}
