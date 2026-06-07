(function () {
  const alertBox = document.getElementById('alert');

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.hidden = false;
  }

  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin',
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.hidden = true;
      const fd = new FormData(registerForm);
      const data = {
        username: fd.get('username'),
        email:    fd.get('email'),
        password: fd.get('password'),
      };
      const { ok, json } = await postJSON('/api/auth/register', data);
      if (!ok) return showError(json.error || 'Reģistrācijas kļūda');
      window.location.href = '/app.html';
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.hidden = true;
      const fd = new FormData(loginForm);
      const data = {
        email:    fd.get('email'),
        password: fd.get('password'),
      };
      const { ok, json } = await postJSON('/api/auth/login', data);
      if (!ok) return showError(json.error || 'Ienākšanas kļūda');
      window.location.href = json.role === 'admin' ? '/admin.html' : '/app.html';
    });
  }
})();
