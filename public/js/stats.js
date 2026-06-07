(function () {
  async function api(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.status === 401) { window.location.href = '/login.html'; throw 0; }
    return res.json();
  }
  function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/';
  });

  (async function () {
    const me = await fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.json());
    if (!me.authenticated) return (window.location.href = '/login.html');

    const s = await api('/api/stats');
    document.getElementById('overall').innerHTML = `
      <div class="stat"><div class="num">${s.totals.total || 0}</div><div class="lbl">Visi uzdevumi</div></div>
      <div class="stat"><div class="num">${s.totals.done  || 0}</div><div class="lbl">Pabeigti</div></div>
      <div class="stat"><div class="num">${s.totals.pending || 0}</div><div class="lbl">Atlikuši</div></div>
      <div class="stat"><div class="num">${s.totals.smart || 0}</div><div class="lbl">SMART</div></div>
      <div class="stat"><div class="num">${s.totals.overdue || 0}</div><div class="lbl">Termiņš pārkāpts</div></div>
      <div class="stat"><div class="num">${s.completionRate}%</div><div class="lbl">Pabeigšanas %</div></div>
      <div class="stat"><div class="num">${s.subtaskProgress.done || 0}/${s.subtaskProgress.total || 0}</div><div class="lbl">Apakšuzdevumi</div></div>
    `;
    document.getElementById('byCategory').innerHTML = s.byCategory.length
      ? '<table><thead><tr><th>Kategorija</th><th>Visi</th><th>Pabeigti</th><th>%</th></tr></thead><tbody>' +
        s.byCategory.map(r => `<tr>
          <td><span class="dot" style="background:${escapeHTML(r.color)}"></span> ${escapeHTML(r.category)}</td>
          <td>${r.total}</td><td>${r.done || 0}</td>
          <td>${r.total ? Math.round(100*(r.done||0)/r.total) : 0}%</td>
        </tr>`).join('') + '</tbody></table>'
      : '<div class="muted small">Nav datu.</div>';

    document.getElementById('last7').innerHTML = s.last7.length
      ? '<table><thead><tr><th>Datums</th><th>Pabeigti uzdevumi</th></tr></thead><tbody>' +
        s.last7.map(r => `<tr><td>${escapeHTML(r.day)}</td><td>${r.count}</td></tr>`).join('') +
        '</tbody></table>'
      : '<div class="muted small">Pēdējās 7 dienās nav pabeigtu uzdevumu.</div>';
  })();
})();
