// login-register.js

// ── Toggle between Login / Register panels ──────────────────────────────────
const container   = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn    = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => container.classList.add('active'));
loginBtn.addEventListener('click',    () => container.classList.remove('active'));

// ── Password visibility toggles ─────────────────────────────────────────────
function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (!input || !icon) return;

    icon.addEventListener('click', () => {
        const isHidden = input.type === 'password';
        input.type     = isHidden ? 'text' : 'password';
        icon.src       = isHidden ? 'eye-solid.png' : 'eye-slash-solid.png';
    });
}
togglePassword('login-password',    'login-eyeicon');
togglePassword('register-password', 'register-eyeicon');

// ── Helpers ──────────────────────────────────────────────────────────────────
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent   = message;
    el.style.display = message ? 'block' : 'none';
}

function setLoading(btn, isLoading, originalText) {
    btn.disabled    = isLoading;
    btn.textContent = isLoading ? 'Please wait…' : originalText;
}

// ── Admin LOGIN ──────────────────────────────────────────────────────────────
const loginForm = document.querySelector('.form-box.login form');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('login-error', '');

    const email    = loginForm.querySelector('input[type="email"]').value.trim();
    const password = document.getElementById('login-password').value;   
    const btn      = loginForm.querySelector('.btn-primary');

    setLoading(btn, true, 'Login as administrator');

    try {
        const formData = new FormData();
        formData.append('email',    email);
        formData.append('password', password);

        const res  = await fetch('/SmartLab/auth/admin-login.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            showError('login-error', data.message);
        }
    } catch (err) {
        showError('login-error', 'Network error. Please try again.');
    } finally {
        setLoading(btn, false, 'Login as administrator');
    }
});

// ── Admin REGISTER ───────────────────────────────────────────────────────────
const registerForm = document.querySelector('.form-box.register form');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('register-error', '');

    const agreeBox = document.getElementById('agree');
    const btn      = registerForm.querySelector('.btn-primary1');

    if (!agreeBox.checked) {
        showError('register-error', 'You must agree to the Terms of Service and Privacy Policy.');
        return;
    }

    const getValue = (name) => {
        const el = registerForm.querySelector(`[name="${name}"]`);
        return el ? el.value.trim() : '';
    };

    const formData = new FormData();
    formData.append('first_name',     getValue('first_name'));
    formData.append('last_name',      getValue('last_name'));
    formData.append('username',       getValue('username'));
    formData.append('email',          getValue('email'));
    formData.append('password',       registerForm.querySelector('#register-password').value);
    formData.append('user_type',      getValue('user_type'));

    setLoading(btn, true, 'Register');

    try {
        const res  = await fetch('/SmartLab/auth/admin-register.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            showError('register-error', data.message);
        }
    } catch (err) {
        showError('register-error', 'Network error. Please try again.');
    } finally {
        setLoading(btn, false, 'Register');
    }
});

// ── Google OAuth error from redirect ────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const errorMessages = {
    google_denied:    'Google sign-in was cancelled.',
    token_failed:     'Failed to authenticate with Google.',
    token_expired:    'Google session expired. Please try again.',
    account_inactive: 'Your account has been deactivated.',
    db_error:         'A server error occurred. Please try again.',
};
const err = params.get('error');
if (err && errorMessages[err]) {
    showError('google-error', errorMessages[err]);
}