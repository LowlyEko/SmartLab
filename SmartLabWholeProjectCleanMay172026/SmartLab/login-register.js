const API_BASE = 'http://localhost:5000/api';

// ── Redirect if already logged in ────────────────────────────────────────────
if (localStorage.getItem('smartlab_admin_token')) {
  window.location.href = 'dashboard.html';
}

// ── Panel toggle ──────────────────────────────────────────────────────────────
const container   = document.getElementById('container');
document.querySelector('.register-btn').addEventListener('click', () => container.classList.add('active'));
document.querySelector('.login-btn').addEventListener('click',    () => container.classList.remove('active'));

// ── Password eye toggles ──────────────────────────────────────────────────────
function setupEye(eyeId, inputId) {
  const eye   = document.getElementById(eyeId);
  const input = document.getElementById(inputId);
  if (!eye || !input) return;
  eye.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type  = show ? 'text' : 'password';
    eye.src     = show ? 'eye-solid.png' : 'eye-slash-solid.png';
  });
}
setupEye('login-eyeicon',    'login-password');
setupEye('register-eyeicon', 'register-password');

// ── Helpers ───────────────────────────────────────────────────────────────────
function showMsg(id, msg, isError = true) {
  const el = document.getElementById(id);
  el.textContent    = msg;
  el.style.display  = 'block';
}
function hideMsg(id) {
  document.getElementById(id).style.display = 'none';
}
function setLoading(btnId, loading, label = 'Submit') {
  const btn        = document.getElementById(btnId);
  btn.disabled     = loading;
  btn.textContent  = loading ? 'Please wait...' : label;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMsg('login-error');

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    return showMsg('login-error', 'Please enter your username and password.');
  }

  setLoading('login-btn', true, 'Sign In');

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      const user          = data.data.user;
      const allowedRoles  = ['LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN'];

      if (!allowedRoles.includes(user.user_type)) {
        return showMsg('login-error', 'Access denied. This portal is for staff only.');
      }

      localStorage.setItem('smartlab_admin_token', data.data.token);
      localStorage.setItem('smartlab_admin_user',  JSON.stringify(user));
      window.location.href = 'dashboard.html';
    } else {
      showMsg('login-error', data.message || 'Invalid username or password.');
    }
  } catch (err) {
    showMsg('login-error', 'Could not connect to the server. Please try again.');
    console.error(err);
  } finally {
    setLoading('login-btn', false, 'Sign In');
  }
});

// ── REGISTER ──────────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMsg('register-error');
  hideMsg('register-success');

  const first_name = document.getElementById('reg-firstname').value.trim();
  const last_name  = document.getElementById('reg-lastname').value.trim();
  const username   = document.getElementById('reg-username').value.trim();
  const email      = document.getElementById('reg-email').value.trim();
  const password   = document.getElementById('register-password').value;
  const user_type  = 'LABORATORY_STAFF';
  const agreed     = document.getElementById('agree-terms').checked;

  if (!first_name || !last_name || !username || !email || !password) {
    return showMsg('register-error', 'All fields are required.');
  }
  if (!agreed) {
    return showMsg('register-error', 'You must agree to the Terms of Service.');
  }

  setLoading('register-btn', true, 'Create Account');

  try {
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, first_name, last_name, email, password, user_type }),
    });
    const data = await res.json();

    if (data.success) {
      showMsg('register-success', 'Account created! Redirecting...', false);
      document.getElementById('register-success').style.background = '#f0fff4';
      document.getElementById('register-success').style.color      = '#276749';

      localStorage.setItem('smartlab_admin_token', data.data.token);
      localStorage.setItem('smartlab_admin_user',  JSON.stringify(data.data.user));

      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    } else {
      showMsg('register-error', data.message || 'Registration failed. Please try again.');
    }
  } catch (err) {
    showMsg('register-error', 'Could not connect to the server. Please try again.');
    console.error(err);
  } finally {
    setLoading('register-btn', false, 'Create Account');
  }
  
});
// ── GOOGLE STUDENT LOGIN ──────────────────────────────────────────────────────
async function handleGoogleLogin(response) {
  const errorEl = document.getElementById('google-error');
  errorEl.style.display = 'none';

  try {
    const res  = await fetch(`${API_BASE}/auth/google-student`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user',  JSON.stringify(data.data.user));
      window.location.href = '../student/index.html';
    } else {
      errorEl.textContent = data.message || 'Google login failed. Please try again.';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Could not connect to the server. Please try again.';
    errorEl.style.display = 'block';
    console.error(err);
  }
}