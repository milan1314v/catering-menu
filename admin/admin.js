/**
 * DineVault Admin Client Script for Cloudflare Pages
 */

function getAuthToken() {
  return localStorage.getItem('dinevault_admin_token');
}

function setAuthToken(token) {
  localStorage.setItem('dinevault_admin_token', token);
}

function clearAuthToken() {
  localStorage.removeItem('dinevault_admin_token');
}

function requireAuth() {
  const token = getAuthToken();
  if (!token) {
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
