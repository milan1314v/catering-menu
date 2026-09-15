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

// Client-side image compression for device uploads
function compressImageFile(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Image decode error'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

// Auto-fetch pending caterer count and unread messages for sidebar notification badges
async function updateSidebarNotificationBadges() {
  const pendingBadge = document.getElementById('sidebarPendingBadge');
  const messagesBadge = document.getElementById('sidebarMessagesBadge');

  if (!pendingBadge && !messagesBadge) return;

  try {
    const res = await fetch('/api/admin/stats', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      const s = data.stats || {};
      
      // 1. Pending caterers badge
      if (pendingBadge) {
        const pendingCount = s.pending_restaurants || 0;
        if (pendingCount > 0) {
          pendingBadge.textContent = pendingCount;
          pendingBadge.style.display = 'inline-block';
        } else {
          pendingBadge.style.display = 'none';
        }
      }

      // 2. Unread messages badge
      if (messagesBadge) {
        const unreadCount = s.unread_contacts || 0;
        if (unreadCount > 0) {
          messagesBadge.textContent = unreadCount;
          messagesBadge.style.display = 'inline-block';
        } else {
          messagesBadge.style.display = 'none';
        }
      }
    }
  } catch (e) {
    // silent fail
  }
}

// Alias for backward compatibility
function updateSidebarPendingCount() {
  updateSidebarNotificationBadges();
}

document.addEventListener('DOMContentLoaded', () => {
  if (getAuthToken()) {
    updateSidebarNotificationBadges();
  }
});
