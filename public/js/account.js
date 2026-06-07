(function () {
  const alertEl = document.getElementById('alert');
  function show(msg, kind) {
    alertEl.className = 'alert alert--' + (kind || 'info');
    alertEl.textContent = msg;
    alertEl.hidden = false;
  }
  async function api(url, opts={}) {
    const res = await fetch(url, {
      credentials:'same-origin',
      headers: opts.body ? { 'Content-Type':'application/json' } : {},
      ...opts,
    });
    if (res.status === 401) { window.location.href = '/login.html'; throw 0; }
    const j = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(j.error || 'Kļūda');
    return j;
  }

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

  (async function () {
    const me = await fetch('/api/auth/me', { credentials:'same-origin' }).then(r=>r.json());
    if (!me.authenticated) return (window.location.href = '/login.html');
    document.getElementById('username').value    = me.user.username;
    document.getElementById('email').value       = me.user.email;
    document.getElementById('description').value = me.user.description || '';
  })();

  document.getElementById('accountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.hidden = true;
    const data = {
      username: document.getElementById('username').value.trim(),
      email:    document.getElementById('email').value.trim(),
      description: document.getElementById('description').value.trim(),
    };
    const pw = document.getElementById('password').value;
    if (pw) data.password = pw;
    try {
      await api('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) });
      show('Konts atjaunināts', 'success');
      document.getElementById('password').value = '';
    } catch (err) { show(err.message, 'error'); }
  });
})();
