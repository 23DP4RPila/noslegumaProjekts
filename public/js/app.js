(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('lv-LV', { dateStyle: 'short', timeStyle: 'short' });
  }
  async function api(url, opts = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {},
      ...opts,
    });
    if (res.status === 401) { window.location.href = '/login.html'; throw new Error('unauth'); }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Kļūda');
    return json;
  }

  let categoriesCache = [];
  let tasksCache = [];

  (async function init() {
    const me = await fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.json());
    if (!me.authenticated) return (window.location.href = '/login.html');
    $('#userBadge').textContent = `${me.user.username}`;
    if (me.user.role === 'admin') {
      const link = $('#adminLink');
      link.hidden = false; link.href = '/admin.html';
    }
    bindUI();
    await loadCategories();
    await loadTasks();
    await loadFocus();
  })();

  function bindUI() {
    $('#logoutBtn').addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });

    $('#newType').addEventListener('change', (e) => {
      $('#smartFields').hidden = e.target.value !== 'smart';
    });

    ['searchInput','filterStatus','filterType','filterCategory','sortBy'].forEach(id => {
      $('#' + id).addEventListener('input', debounce(loadTasks, 200));
    });

    $('#addForm').addEventListener('submit', onAdd);

    $('#addCategoryForm').addEventListener('submit', onAddCategory);

    $('#editCancel').addEventListener('click', () => $('#editDialog').close());
    $('#editForm').addEventListener('submit', onEditSubmit);
  }

  function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  async function loadCategories() {
    categoriesCache = await api('/api/categories');
    const filterSel = $('#filterCategory');
    const newSel    = $('#newCategory');
    const editSel   = $('#editCategory');
    const listEl    = $('#categoryList');

    [filterSel, newSel, editSel].forEach(sel => {
      const first = sel.options[0];
      sel.innerHTML = '';
      sel.appendChild(first);
      for (const c of categoriesCache) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.task_count})`;
        sel.appendChild(opt);
      }
    });

    const activeCatId = $('#filterCategory').value;
    listEl.innerHTML = categoriesCache.map(c => {
      const isActive = String(c.id) === String(activeCatId);
      return `
        <li class="task-item category-row ${isActive ? 'category-row--active' : ''}"
            data-cat-filter="${c.id}" tabindex="0" role="button"
            aria-pressed="${isActive ? 'true' : 'false'}"
            aria-label="${isActive ? 'Atcelt filtru' : 'Filtrēt pēc kategorijas'} ${escapeHTML(c.name)}">
          <span class="dot" style="background:${escapeHTML(c.color)}; width:14px; height:14px;" aria-hidden="true"></span>
          <div class="task-body">
            <span class="task-title">${escapeHTML(c.name)}</span>
            <span class="tag">${c.task_count} uzdevumi · ${c.done_count || 0} pabeigti</span>
            ${isActive ? '<span class="tag tag--accent">aktīvs filtrs · klikšķini, lai atceltu</span>' : ''}
          </div>
          <div class="task-actions">
            <button class="btn btn--ghost btn--small" data-cat-del="${c.id}" aria-label="Dzēst kategoriju ${escapeHTML(c.name)}">Dzēst</button>
          </div>
        </li>
      `;
    }).join('') || '<li class="muted small">Nav kategoriju.</li>';

    listEl.querySelectorAll('[data-cat-filter]').forEach(row => {
      const toggleFilter = async () => {
        const catSel = $('#filterCategory');
        const clickedId = row.dataset.catFilter;
        const currentlyActive = String(catSel.value) === String(clickedId);
        catSel.value = currentlyActive ? '' : clickedId;
        await loadTasks();
        await loadCategories();
        if (!currentlyActive) {
          document.getElementById('taskList').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-cat-del]')) return;
        toggleFilter();
      });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFilter(); }
      });
    });

    listEl.querySelectorAll('[data-cat-del]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Dzēst kategoriju?')) return;
        await api('/api/categories/' + btn.dataset.catDel, { method: 'DELETE' });
        await loadCategories();
        await loadTasks();
      });
    });
  }

  function showActiveFilter() {
    const msg    = $('#activeFilterMsg');
    const search = $('#searchInput').value.trim();
    const status = $('#filterStatus');
    const type   = $('#filterType');
    const cat    = $('#filterCategory');
    const sort   = $('#sortBy');

    const active = [];
    if (search)        active.push({ key: 'search',   label: `Meklēšana: "${escapeHTML(search)}"` });
    if (status.value)  active.push({ key: 'status',   label: `Statuss: ${escapeHTML(status.options[status.selectedIndex].textContent)}` });
    if (type.value)    active.push({ key: 'type',     label: `Veids: ${escapeHTML(type.options[type.selectedIndex].textContent)}` });
    if (cat.value)     active.push({ key: 'category', label: `Kategorija: ${escapeHTML(cat.options[cat.selectedIndex].textContent)}` });
    if (sort.value && sort.value !== 'order')
      active.push({ key: 'sort', label: `Kārtošana: ${escapeHTML(sort.options[sort.selectedIndex].textContent)}` });

    if (active.length === 0) {
      msg.style.display = 'none';
      msg.textContent = '';
      return;
    }

    msg.style.display = '';
    msg.innerHTML =
      'Aktīvie filtri: ' +
      active.map(a => `<span class="tag tag--accent">${a.label}</span>`).join(' ') +
      ' <a href="#" id="clearAllFilters">Notīrīt visus filtrus</a>';

    msg.querySelector('#clearAllFilters').addEventListener('click', async (e) => {
      e.preventDefault();
      $('#searchInput').value = '';
      $('#filterStatus').value = '';
      $('#filterType').value = '';
      $('#filterCategory').value = '';
      $('#sortBy').value = 'order';
      await loadTasks();
      await loadCategories();
    });
  }

  async function loadTasks() {
    const params = new URLSearchParams();
    const search = $('#searchInput').value.trim();
    const status = $('#filterStatus').value;
    const type   = $('#filterType').value;
    const cat    = $('#filterCategory').value;
    const sort   = $('#sortBy').value;
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (type)   params.set('type', type);
    if (cat)    params.set('category_id', cat);
    if (sort)   params.set('sort', sort);

    tasksCache = await api('/api/tasks?' + params.toString());
    renderTasks(tasksCache);
    showActiveFilter();
  }

  function renderTasks(tasks) {
    const ul = $('#taskList');
    $('#emptyMsg').hidden = tasks.length > 0;
    ul.innerHTML = tasks.map(t => {
      const subProg = t.subtasks_total > 0 ? `${t.subtasks_done}/${t.subtasks_total}` : '';
      const cat = t.category_name
        ? `<span class="tag"><span class="dot" style="background:${escapeHTML(t.category_color)}"></span> ${escapeHTML(t.category_name)}</span>`
        : '';
      const dl = t.deadline ? `<span class="tag">⏰ ${escapeHTML(fmtDate(t.deadline))}</span>` : '';
      const typeTag = t.type === 'smart' ? `<span class="tag">SMART</span>` : '';
      const prioLabels = { 1: '⚑ Zema', 2: '⚑⚑ Vidēja', 3: '⚑⚑⚑ Augsta' };
      const prio = prioLabels[t.priority] ? `<span class="tag">${prioLabels[t.priority]}</span>` : '';
      return `
        <li class="task-item ${t.status === 'done' ? 'task-item--done' : ''}">
          <input class="task-checkbox" type="checkbox" ${t.status === 'done' ? 'checked' : ''}
                 aria-label="Atzīmēt kā ${t.status === 'done' ? 'nepabeigtu' : 'pabeigtu'}"
                 data-toggle="${t.id}" />
          <div class="task-body">
            <span class="task-title">${escapeHTML(t.title)}</span>
            ${cat}${dl}${typeTag}${prio}${subProg ? `<span class="tag">📋 ${subProg}</span>` : ''}
          </div>
          <div class="task-actions">
            <button class="btn btn--ghost btn--small" data-edit="${t.id}">Rediģēt</button>
            <button class="btn btn--ghost btn--small" data-del="${t.id}">Dzēst</button>
          </div>
        </li>
      `;
    }).join('');

    ul.querySelectorAll('[data-toggle]').forEach(cb => cb.addEventListener('change', onToggleStatus));
    ul.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', openEdit));
    ul.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', onDelete));
  }

  async function loadFocus() {
    const t = await api('/api/tasks/current/now');
    const wrap = $('#focusArea');
    if (!t) {
      wrap.innerHTML = `<div class="focus-card"><div class="title">🎉 Nav atlikušu uzdevumu!</div><div class="desc">Tu esi pabeidzis visu. Lielisks darbs!</div></div>`;
      return;
    }
    const subtasksHTML = (t.subtasks || []).map(s => `
      <div class="subtask">
        <input type="checkbox" ${s.completed ? 'checked' : ''} data-subtoggle="${s.id}" id="sub-${s.id}" />
        <label for="sub-${s.id}" style="${s.completed ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escapeHTML(s.title)}</label>
        <button class="btn btn--ghost btn--small" data-subdel="${s.id}" aria-label="Dzēst apakšuzdevumu">×</button>
      </div>
    `).join('');

    const smartHTML = t.type === 'smart' ? `
      <div class="muted small" style="text-align:left; margin-top:14px; padding:10px; background:var(--bg); border-radius:var(--radius);">
        ${t.smart_specific   ? `<div><b>S:</b> ${escapeHTML(t.smart_specific)}</div>` : ''}
        ${t.smart_measurable ? `<div><b>M:</b> ${escapeHTML(t.smart_measurable)}</div>` : ''}
        ${t.smart_achievable ? `<div><b>A:</b> ${escapeHTML(t.smart_achievable)}</div>` : ''}
        ${t.smart_relevant   ? `<div><b>R:</b> ${escapeHTML(t.smart_relevant)}</div>` : ''}
        ${t.smart_timebound  ? `<div><b>T:</b> ${escapeHTML(t.smart_timebound)}</div>` : ''}
      </div>` : '';

    wrap.innerHTML = `
      <div class="focus-card">
        <div class="title">${escapeHTML(t.title)}</div>
        ${t.description ? `<div class="desc">${escapeHTML(t.description)}</div>` : ''}
        ${t.deadline ? `<div class="muted small">Termiņš: ${escapeHTML(fmtDate(t.deadline))}</div>` : ''}
        ${smartHTML}
        <div style="margin-top:18px; text-align:left;">
          <h3 style="margin:0 0 8px;">Apakšsoļi</h3>
          ${subtasksHTML || '<div class="muted small">Nav apakšsoļu.</div>'}
          <form id="subAddForm" class="inline-form" style="margin-top:10px; max-width:420px;">
            <input id="subTitle" placeholder="Jauns apakšsolis..." maxlength="200" aria-label="Jauns apakšsolis" />
            <button type="submit" class="btn--ghost" aria-label="Pievienot apakšsoli">+</button>
          </form>
        </div>
        <div style="margin-top:20px;">
          <button class="btn btn--success" data-complete="${t.id}">Pabeigt uzdevumu</button>
        </div>
      </div>
    `;

    wrap.querySelector('[data-complete]').addEventListener('click', async (e) => {
      await api('/api/tasks/' + e.target.dataset.complete, {
        method: 'PUT', body: JSON.stringify({ status: 'done' }),
      });
      await loadFocus();
      await loadTasks();
      await loadCategories();
    });
    wrap.querySelectorAll('[data-subtoggle]').forEach(cb => {
      cb.addEventListener('change', async () => {
        await api('/api/subtasks/' + cb.dataset.subtoggle, {
          method: 'PUT', body: JSON.stringify({ completed: cb.checked }),
        });
        await loadFocus();
        await loadTasks();
      });
    });
    wrap.querySelectorAll('[data-subdel]').forEach(b => {
      b.addEventListener('click', async () => {
        await api('/api/subtasks/' + b.dataset.subdel, { method: 'DELETE' });
        await loadFocus();
        await loadTasks();
      });
    });
    const subForm = wrap.querySelector('#subAddForm');
    subForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = wrap.querySelector('#subTitle').value.trim();
      if (!title) return;
      await api('/api/subtasks', {
        method: 'POST',
        body: JSON.stringify({ task_id: t.id, title }),
      });
      await loadFocus();
      await loadTasks();
    });
  }

  async function onAdd(e) {
    e.preventDefault();
    const f = e.target;
    const data = {
      title:       f.title.value.trim(),
      description: f.description.value.trim(),
      deadline:    f.deadline.value || null,
      type:        f.type.value,
      priority:    parseInt(f.priority.value, 10),
      category_id: f.category_id.value || null,
    };
    if (data.type === 'smart') {
      data.smart_specific   = $('#smart_specific').value;
      data.smart_measurable = $('#smart_measurable').value;
      data.smart_achievable = $('#smart_achievable').value;
      data.smart_relevant   = $('#smart_relevant').value;
      data.smart_timebound  = $('#smart_timebound').value;
    }
    const alertEl = $('#addAlert');
    alertEl.hidden = true;
    try {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
      f.reset();
      $('#smartFields').hidden = true;
      await loadTasks();
      await loadCategories();
      await loadFocus();
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.hidden = false;
    }
  }

  async function onAddCategory(e) {
    e.preventDefault();
    const name  = $('#catName').value.trim();
    const color = $('#catColor').value;
    if (!name) return;
    await api('/api/categories', { method: 'POST', body: JSON.stringify({ name, color }) });
    $('#catName').value = '';
    await loadCategories();
  }

  async function onToggleStatus(e) {
    const id = e.target.dataset.toggle;
    const status = e.target.checked ? 'done' : 'pending';
    await api('/api/tasks/' + id, { method: 'PUT', body: JSON.stringify({ status }) });
    await loadTasks();
    await loadFocus();
    await loadCategories();
  }

  async function onDelete(e) {
    if (!confirm('Dzēst uzdevumu?')) return;
    await api('/api/tasks/' + e.target.dataset.del, { method: 'DELETE' });
    await loadTasks();
    await loadFocus();
    await loadCategories();
  }

  function openEdit(e) {
    const id = parseInt(e.target.dataset.edit, 10);
    const t = tasksCache.find(x => x.id === id);
    if (!t) return;
    $('#editId').value = t.id;
    $('#editTitle').value = t.title;
    $('#editDescription').value = t.description || '';
    $('#editDeadline').value = t.deadline ? new Date(t.deadline).toISOString().slice(0,16) : '';
    $('#editCategory').value = t.category_id || '';
    $('#editPriority').value = t.priority || 0;
    $('#editDialog').showModal();
  }

  async function onEditSubmit(e) {
    e.preventDefault();
    const id = $('#editId').value;
    const data = {
      title:       $('#editTitle').value.trim(),
      description: $('#editDescription').value.trim(),
      deadline:    $('#editDeadline').value || null,
      category_id: $('#editCategory').value || null,
      priority:    parseInt($('#editPriority').value, 10),
    };
    await api('/api/tasks/' + id, { method: 'PUT', body: JSON.stringify(data) });
    $('#editDialog').close();
    await loadTasks();
    await loadFocus();
  }
})();
