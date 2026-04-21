/* ============================================
   EHR RBAC System - Core Application JS
   ============================================ */

const API_BASE = '/api';

// ============ API HELPERS ============
async function apiRequest(method, endpoint, body = null) {
  const token = localStorage.getItem('ehr_token');
  const options = {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (res.status === 401) {
      logout();
      return null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    showToast('Network error. Please check your connection.', 'error');
    return null;
  }
}

const api = {
  get: (ep) => apiRequest('GET', ep),
  post: (ep, body) => apiRequest('POST', ep, body),
  put: (ep, body) => apiRequest('PUT', ep, body),
  delete: (ep) => apiRequest('DELETE', ep),
};

// ============ AUTH ============
function getUser() {
  const u = localStorage.getItem('ehr_user');
  return u ? JSON.parse(u) : null;
}
function getToken() { return localStorage.getItem('ehr_token'); }
function isLoggedIn() { return !!getToken() && !!getUser(); }

function logout() {
  api.post('/auth/logout').catch(() => {});
  localStorage.removeItem('ehr_token');
  localStorage.removeItem('ehr_user');
  window.location.href = '/';
}

// Guard — redirect if not authenticated
function requireAuth(allowedRoles = []) {
  if (!isLoggedIn()) { window.location.href = '/'; return false; }
  const user = getUser();
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = '/access-denied.html';
    return false;
  }
  return true;
}

// ============ TOAST ============
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ============ MODAL ============
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function createModal(id, title, bodyHtml, footerHtml = '') {
  let m = document.getElementById(id);
  if (!m) { m = document.createElement('div'); m.id = id; m.className = 'modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = `<div class="modal">
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" onclick="closeModal('${id}')">✕</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  </div>`;
  m.style.display = 'flex';
  m.addEventListener('click', (e) => { if (e.target === m) closeModal(id); });
}

// ============ SIDEBAR ============
function initSidebar(activeItem) {
  const user = getUser();
  if (!user) return;

  const avatarColors = { admin: '#7c3aed', clinician: '#1e40af', patient: '#065f46' };
  const avatarColor = avatarColors[user.role] || '#374151';
  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

  document.querySelectorAll('.user-avatar').forEach(el => {
    el.style.background = avatarColor;
    el.textContent = initials;
  });
  document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = user.name);
  document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1));
  document.querySelectorAll('.topbar-user-name').forEach(el => el.textContent = user.name);

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === activeItem);
  });
}

// ============ DATE UTILS ============
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ============ BADGE HELPERS ============
function roleBadge(role) {
  const labels = { admin: 'Admin', clinician: 'Clinician', patient: 'Patient' };
  return `<span class="badge badge-${role}">${labels[role] || role}</span>`;
}
function statusBadge(status) {
  const map = {
    GRANTED: 'badge-success', DENIED: 'badge-danger',
    scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-gray',
    '1': 'badge-success', '0': 'badge-danger',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

// ============ EMPTY STATE ============
function emptyState(icon, title, text) {
  return `<div class="empty-state"><div class="icon">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;
}

// ============ PAGE LOADER ============
function showPageLoader(containerId) {
  document.getElementById(containerId).innerHTML = `<div class="page-loader"><div class="spinner"></div><p>Loading...</p></div>`;
}
