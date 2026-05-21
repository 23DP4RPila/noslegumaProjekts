// Admin panel
(function () {
  function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function api(url, opts={}) {
    const res = await fetch(url, {
      credentials:'same-origin',
      headers: opts.body ? { 'Content-Type':'application/json' } : {},
      ...opts,
    });
    if (res.status === 401) { window.location.href = '/login.html'; throw 0; }
    if (res.status === 403) { alert('Nav admin tiesību'); window.location.href = '/app.html'; throw 0; }
    const j = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(j.error || 'Kļūda');
    return j;
  }

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

  let usersCache = [];

  (async function () {
    const me = await fetch('/api/auth/me', { credentials:'same-origin' }).then(r=>r.json());
    if (!me.authenticated) return (window.location.href = '/login.html');
    if (me.user.role !== 'admin') return (window.location.href = '/app.html');
    await loadSysStats();
    await loadUsers();
  })();

  async function loadSysStats() {
    const s = await api('/api/admin/stats');
    document.getElementById('sysStats').innerHTML = `
      <div class="stat"><div class="num">${s.totals.total_users}</div><div class="lbl">Lietotāji</div></div>
      <div class="stat"><div class="num">${s.totals.admin_count}</div><div class="lbl">Administratori</div></div>
      <div class="stat"><div class="num">${s.totals.total_tasks}</div><div class="lbl">Uzdevumi</div></div>
      <div class="stat"><div class="num">${s.totals.done_tasks}</div><div class="lbl">Pabeigti</div></div>
      <div class="stat"><div class="num">${s.totals.total_subtasks}</div><div class="lbl">Apakšuzdevumi</div></div>
      <div class="stat"><div class="num">${s.totals.total_categories}</div><div class="lbl">Kategorijas</div></div>
    `;
    document.querySelector('#topUsersTable tbody').innerHTML = s.topUsers.map(u => `
      <tr><td>${escapeHTML(u.username)}</td><td>${u.total_tasks}</td><td>${u.done_tasks || 0}</td><td>${u.completion_pct}%</td></tr>
    `).join('') || '<tr><td colspan="4" class="muted small">Nav datu.</td></tr>';

    document.querySelector('#activityTable tbody').innerHTML = s.recentActivity.map(a => `
      <tr>
        <td>${escapeHTML(a.created_at)}</td>
        <td>${escapeHTML(a.username || '—')}</td>
        <td>${escapeHTML(a.action)}</td>
        <td>${escapeHTML(a.target_type || '')} ${a.target_id || ''}</td>
        <td>${escapeHTML(a.ip_address || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="muted small">Nav darbību.</td></tr>';
  }

  async function loadUsers() {
    const q = document.getElementById('searchUsers').value.trim();
    const r = document.getElementById('filterRole').value;
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (r) params.set('role', r);
    usersCache = await api('/api/admin/users?' + params.toString());
    document.querySelector('#usersTable tbody').innerHTML = usersCache.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${escapeHTML(u.username)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>
          <select data-role="${u.id}">
            <option value="user"  ${u.role==='user'?'selected':''}>user</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
          </select>
        </td>
        <td><input type="checkbox" data-active="${u.id}" ${u.is_active?'checked':''} aria-label="Aktīvs" /></td>
        <td>${u.task_count}</td>
        <td>${u.done_count || 0}</td>
        <td><button class="btn btn--ghost btn--small" data-del-user="${u.id}">Dzēst</button></td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="muted small">Nav lietotāju.</td></tr>';

    document.querySelectorAll('[data-role]').forEach(sel => sel.addEventListener('change', async () => {
      await api('/api/admin/users/' + sel.dataset.role, { method: 'PUT', body: JSON.stringify({ role: sel.value }) });
      await loadSysStats();
    }));
    document.querySelectorAll('[data-active]').forEach(cb => cb.addEventListener('change', async () => {
      await api('/api/admin/users/' + cb.dataset.active, { method: 'PUT', body: JSON.stringify({ is_active: cb.checked }) });
    }));
    document.querySelectorAll('[data-del-user]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Dzēst lietotāju? Visi uzdevumi tiks dzēsti.')) return;
      try {
        await api('/api/admin/users/' + b.dataset.delUser, { method: 'DELETE' });
        await loadUsers();
        await loadSysStats();
      } catch (e) { alert(e.message); }
    }));
  }

  document.getElementById('searchUsers').addEventListener('input', debounce(loadUsers, 200));
  document.getElementById('filterRole').addEventListener('change', loadUsers);

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }; }
})();
