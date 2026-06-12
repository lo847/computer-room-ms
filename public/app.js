(function () {
  'use strict';
  var API = '/api';
  var token = localStorage.getItem('crms_token');
  var currentUser = null;
  function setToken(t) { token = t; if (t) localStorage.setItem('crms_token', t); else localStorage.removeItem('crms_token'); }

  async function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    var resp = await fetch(API + path, {
      method: opts.method || 'GET', headers: headers,
      body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined
    });
    var data = await resp.json().catch(function () { return null; });
    if (!resp.ok) throw new Error((data && data.error) || '请求失败 (' + resp.status + ')');
    return data;
  }

  function escapeHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

  function formatTime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  var toastTimer;
  function showToast(text, type) {
    var el = document.getElementById('toast');
    clearTimeout(toastTimer); el.textContent = text; el.className = 'toast ' + (type || 'info');
    requestAnimationFrame(function () { el.classList.add('show'); });
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2800);
  }

  function showModal(title, bodyHtml, onConfirm, confirmText) {
    var overlay = document.getElementById('modal-overlay');
    var modal = document.getElementById('modal');
    modal.innerHTML = '<h3>' + title + '</h3><div>' + bodyHtml + '</div><div class="modal-actions"><button class="btn btn-secondary btn-sm" id="modal-cancel">取消</button><button class="btn btn-danger btn-sm" id="modal-confirm">' + (confirmText || '确认') + '</button></div>';
    overlay.classList.remove('hidden');
    document.getElementById('modal-cancel').onclick = function () { overlay.classList.add('hidden'); };
    document.getElementById('modal-confirm').onclick = function () { overlay.classList.add('hidden'); if (onConfirm) onConfirm(); };
  }

  function navigate(hash) { location.hash = hash; }

  function getRoute() {
    var h = location.hash.slice(1) || 'dashboard';
    var parts = h.split('/');
    return { page: parts[0], id: parts[1] || null };
  }

  function renderNavbar(route) {
    var nav = document.getElementById('navbar');
    if (!currentUser) { nav.innerHTML = ''; return; }
    var avatarHtml = currentUser.avatar
      ? '<img src="' + currentUser.avatar + '" alt="">'
      : currentUser.name.charAt(0);
    var items = [
      { p: 'dashboard', l: '首页', i: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
      { p: 'forum', l: '论坛', i: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
      { p: 'profile', l: '个人中心', i: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
    ];
    if (currentUser.role === 'admin') {
      items.push({ p: 'admin', l: '管理', i: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' });
    }
    var html = '<div class="navbar-brand"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>机房管理系统</div><div class="navbar-nav">';
    items.forEach(function (it) {
      html += '<button class="' + (route.page === it.p ? ' active' : '') + '" data-page="' + it.p + '">' + it.i + ' <span class="nav-label">' + it.l + '</span></button>';
    });
    html += '</div><div class="navbar-user"><div class="avatar-sm">' + avatarHtml + '</div><span>' + escapeHtml(currentUser.name) + '</span><button class="logout-btn" id="lbtn">退出</button></div>';
    nav.innerHTML = html;
    document.getElementById('lbtn').addEventListener('click', function () { setToken(null); currentUser = null; navigate('login'); });
    nav.querySelectorAll('.navbar-nav button').forEach(function (b) { b.addEventListener('click', function () { navigate(b.dataset.page); }); });
  }

  var main = document.getElementById('main');

  function renderLogin() {
    main.innerHTML = '<div class="auth-page"><div class="auth-card"><h1>机房人员信息管理系统</h1><p class="subtitle">请使用学号和密码登录</p><div class="form-group"><label>学号</label><input type="text" id="loginSid" placeholder="请输入学号" autofocus></div><div class="form-group"><label>密码</label><input type="password" id="loginPw" placeholder="请输入密码"></div><div id="loginMsg" class="form-msg"></div><button class="btn btn-primary" id="loginBtn">登 录</button><p class="auth-link">还没有账号？<a id="toRegister">立即注册</a></p></div></div>';
    document.getElementById('loginBtn').addEventListener('click', doLogin);
    document.getElementById('loginPw').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    document.getElementById('toRegister').addEventListener('click', function () { navigate('register'); });
  }

  async function doLogin() {
    var sid = document.getElementById('loginSid').value.trim();
    var pw = document.getElementById('loginPw').value;
    var msg = document.getElementById('loginMsg');
    if (!sid || !pw) { msg.textContent = '请输入学号和密码'; msg.className = 'form-msg error'; return; }
    var btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = '登录中...'; msg.textContent = '';
    try {
      var res = await api('/auth/login', { method: 'POST', body: { student_id: sid, password: pw } });
      setToken(res.token); currentUser = res.user; navigate('dashboard');
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    finally { btn.disabled = false; btn.textContent = '登 录'; }
  }

  function renderRegister() {
    var year = new Date().getFullYear();
    var opts = '';
    for (var y = year; y >= year - 30; y--) opts += '<option value="' + y + '">' + y + ' 届</option>';
    opts += '<option value="__custom__">自定义届别...</option>';
    main.innerHTML = '<div class="auth-page"><div class="auth-card"><h1>注册账号</h1><p class="subtitle">填写信息创建新账号</p><div class="form-row"><div class="form-group"><label>学号 *</label><input type="text" id="regSid" placeholder="请输入学号" maxlength="20"></div><div class="form-group"><label>姓名 *</label><input type="text" id="regName" placeholder="请输入姓名" maxlength="50"></div></div><div class="form-row"><div class="form-group"><label>密码 *</label><input type="password" id="regPw" placeholder="至少6位"></div><div class="form-group"><label>确认密码 *</label><input type="password" id="regPw2" placeholder="再次输入密码"></div></div><div class="form-group"><label>毕业届数 *</label><select id="regYear"><option value="">选择届别</option>' + opts + '</select><input type="text" id="regYearCustom" placeholder="输入自定义届别" maxlength="20" style="display:none;margin-top:8px"></div><div class="form-row"><div class="form-group"><label>手机号</label><input type="tel" id="regPhone" placeholder="选填" maxlength="20"></div><div class="form-group"><label>邮箱</label><input type="email" id="regEmail" placeholder="选填" maxlength="100"></div></div><div class="form-group"><label>家庭地址</label><input type="text" id="regAddr" placeholder="选填" maxlength="200"></div><div class="form-group"><label>当前职业/状态</label><input type="text" id="regOcc" placeholder="选填，如：学生、工程师..." maxlength="100"></div><div id="regMsg" class="form-msg"></div><button class="btn btn-primary" id="regBtn">注 册</button><p class="auth-link">已有账号？<a id="toLogin">返回登录</a></p></div></div>';
    var selYear2 = document.getElementById('regYear');
    var custInput = document.getElementById('regYearCustom');
    selYear2.addEventListener('change', function () {
      if (selYear2.value === '__custom__') { custInput.style.display = ''; custInput.focus(); }
      else { custInput.style.display = 'none'; custInput.value = ''; }
    });
    document.getElementById('regBtn').addEventListener('click', doRegister);
    document.getElementById('toLogin').addEventListener('click', function () { navigate('login'); });
  }

  async function doRegister() {
    var sid = document.getElementById('regSid').value.trim();
    var name = document.getElementById('regName').value.trim();
    var pw = document.getElementById('regPw').value;
    var pw2 = document.getElementById('regPw2').value;
    var selYearReg = document.getElementById('regYear');
    var year = selYearReg.value === '__custom__' ? document.getElementById('regYearCustom').value.trim() : selYearReg.value;
    var msg = document.getElementById('regMsg');
    if (!sid || !name || !pw || !year) { msg.textContent = '请填写所有必填项'; msg.className = 'form-msg error'; return; }
    if (pw.length < 6) { msg.textContent = '密码长度不能少于6位'; msg.className = 'form-msg error'; return; }
    if (pw !== pw2) { msg.textContent = '两次密码输入不一致'; msg.className = 'form-msg error'; return; }
    var btn = document.getElementById('regBtn');
    btn.disabled = true; btn.textContent = '注册中...'; msg.textContent = '';
    try {
      var res = await api('/auth/register', { method: 'POST', body: { student_id: sid, name: name, password: pw, confirm_password: pw2, graduate_year: year, phone: document.getElementById('regPhone').value.trim(), email: document.getElementById('regEmail').value.trim(), address: document.getElementById('regAddr').value.trim(), occupation: document.getElementById('regOcc').value.trim() } });
      setToken(res.token); currentUser = res.user; showToast('注册成功', 'success'); navigate('dashboard');
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    finally { btn.disabled = false; btn.textContent = '注 册'; }
  }

  function debounce(fn, ms) {
    var timer;
    return function () { var ctx = this, args = arguments; clearTimeout(timer); timer = setTimeout(function () { fn.apply(ctx, args); }, ms); };
  }

  async function renderDashboard() {
    main.innerHTML = '<div class="page-header"><h2>成员信息</h2><span class="count-badge" id="dashCount">0</span></div><div class="toolbar"><div class="search-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input type="text" id="dashSearch" placeholder="搜索姓名或学号..."></div><select id="dashYear"><option value="">全部届别</option><option value="__custom__">自定义届别...</option></select><input type="text" id="dashYearCustom" placeholder="输入自定义届别" maxlength="20" style="display:none;margin-left:8px;width:160px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;outline:none"></div><div class="card-grid" id="dashCards"></div>';
    loadDashboard();
    document.getElementById('dashSearch').addEventListener('input', debounce(loadDashboard, 300));
    var dashYearSel = document.getElementById("dashYear");
    var dashYearCust = document.getElementById("dashYearCustom");
    dashYearSel.addEventListener("change", function () {
      if (dashYearSel.value === "__custom__") { dashYearCust.style.display = ""; dashYearCust.focus(); }
      else { dashYearCust.style.display = "none"; dashYearCust.value = ""; }
      loadDashboard();
    });
    dashYearCust.addEventListener("input", debounce(loadDashboard, 300));
  }

  async function loadDashboard() {
    var search = document.getElementById('dashSearch') ? document.getElementById('dashSearch').value : '';
    var dashYearSel2 = document.getElementById('dashYear');
    var year = dashYearSel2 ? (dashYearSel2.value === '__custom__' ? document.getElementById('dashYearCustom').value.trim() : dashYearSel2.value) : '';
    try {
      var data = await api('/users?search=' + encodeURIComponent(search) + '&graduate_year=' + encodeURIComponent(year) + '&pageSize=200');
      document.getElementById('dashCount').textContent = data.total;
      var grid = document.getElementById('dashCards');
      if (data.list.length === 0) {
        grid.innerHTML = '<div class="empty-state"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>暂无成员信息</p></div>';
      } else {
        grid.innerHTML = data.list.map(function (u) {
          var av = u.avatar ? '<img class="card-avatar" src="' + u.avatar + '" alt="">' : '<div class="card-avatar-placeholder">' + escapeHtml(u.name.charAt(0)) + '</div>';
          var st = u.status === 0 ? '<span class="card-status disabled">已禁用</span>' : '';
          return '<div class="card" data-id="' + u.id + '">' + av + '<div class="card-info"><div class="card-name">' + escapeHtml(u.name) + '</div><div class="card-meta"><span>学号: ' + escapeHtml(u.student_id) + '</span><span>' + escapeHtml(u.graduate_year) + ' 届</span></div></div>' + st + '</div>';
        }).join('');
        grid.querySelectorAll('.card').forEach(function (c) { c.addEventListener('click', function () { navigate('detail/' + c.dataset.id); }); });
      }
      try {
        var years = await api('/years');
        var sel = document.getElementById('dashYear');
        if (sel && sel.options.length <= 2) {
          years.forEach(function (y) { var o = document.createElement('option'); o.value = y; o.textContent = y + ' 届'; sel.appendChild(o); });
        }
      } catch (_) {}
    } catch (err) { showToast(err.message, 'error'); }
  }

  // Profile
  function renderProfile() {
    var gy = currentUser.graduate_year || '';
    main.innerHTML =
      '<button class="back-link" id="profBack"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>返回首页</button>' +
      '<div class="profile-layout"><div class="profile-sidebar"><div class="profile-avatar-wrap">' +
        (currentUser.avatar ? '<img class="profile-avatar-lg" src="' + currentUser.avatar + '" alt="" id="profAvImg">' : '<div class="profile-avatar-placeholder-lg" id="profAvImg">' + currentUser.name.charAt(0) + '</div>') +
      '</div><div class="profile-avatar-change"><input type="file" id="profAvInput" accept=".jpg,.jpeg,.png,.gif,.webp"><button class="btn btn-outline btn-sm" id="profAvBtn">更换头像</button></div></div>' +
      '<div class="profile-main"><h3>个人资料</h3><div id="profMsg" class="form-msg"></div>' +
      '<div class="form-row"><div class="form-group"><label>姓名</label><input type="text" id="profName" value="' + escapeHtml(currentUser.name) + '"></div><div class="form-group"><label>学号</label><input type="text" value="' + escapeHtml(currentUser.student_id) + '" disabled></div></div>' +
      '<div class="form-row"><div class="form-group"><label>手机号</label><input type="text" id="profPhone" value="' + escapeHtml(currentUser.phone) + '"></div><div class="form-group"><label>邮箱</label><input type="text" id="profEmail" value="' + escapeHtml(currentUser.email) + '"></div></div>' +
      '<div class="form-group"><label>毕业届数</label><input type="text" id="profYear" value="' + escapeHtml(gy) + '"></div>' +
      '<button class="btn btn-primary" id="profSave" style="width:auto">保存修改</button>' +
      '<div class="profile-password-section"><h3>修改密码</h3><div id="pwMsg" class="form-msg"></div>' +
      '<div class="form-group"><label>原密码</label><input type="password" id="pwOld"></div>' +
      '<div class="form-group"><label>新密码</label><input type="password" id="pwNew"></div>' +
      '<button class="btn btn-primary" id="pwSave" style="width:auto">修改密码</button></div></div></div>';
    document.getElementById('profBack').addEventListener('click', function () { navigate('dashboard'); });
    document.getElementById('profAvBtn').addEventListener('click', function () { document.getElementById('profAvInput').click(); });
    document.getElementById('profAvInput').addEventListener('change', async function () {
      var f = this.files[0]; if (!f) return;
      var fd = new FormData(); fd.append('avatar', f);
      try {
        var user = await api('/auth/me/avatar', { method: 'POST', body: fd });
        currentUser = user; showToast('头像更新成功', 'success');
        renderProfile();
      } catch (err) { showToast(err.message, 'error'); }
    });
    document.getElementById('profSave').addEventListener('click', async function () {
      var name = document.getElementById('profName').value.trim();
      var phone = document.getElementById('profPhone').value.trim();
      var email = document.getElementById('profEmail').value.trim();
      var year = document.getElementById('profYear').value.trim();
      var msg = document.getElementById('profMsg');
      try {
        var user = await api('/auth/me', { method: 'PUT', body: { name: name, phone: phone, email: email, graduate_year: year, address: document.getElementById('profAddr').value.trim(), occupation: document.getElementById('profOcc').value.trim() } });
        currentUser = user; msg.textContent = '保存成功'; msg.className = 'form-msg success';
        setTimeout(function () { msg.textContent = ''; }, 2000);
      } catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    });
    document.getElementById('pwSave').addEventListener('click', async function () {
      var oldPw = document.getElementById('pwOld').value;
      var newPw = document.getElementById('pwNew').value;
      var msg = document.getElementById('pwMsg');
      if (!oldPw || !newPw) { msg.textContent = '请填写完整'; msg.className = 'form-msg error'; return; }
      if (newPw.length < 6) { msg.textContent = '新密码长度不能少于6位'; msg.className = 'form-msg error'; return; }
      try {
        await api('/auth/me/password', { method: 'PUT', body: { old_password: oldPw, new_password: newPw } });
        msg.textContent = '密码修改成功'; msg.className = 'form-msg success';
        document.getElementById('pwOld').value = ''; document.getElementById('pwNew').value = '';
      } catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    });
  }

  // Detail
  async function renderDetail(id) {
    main.innerHTML = '<div class="empty-state"><p>加载中...</p></div>';
    try {
      var u = await api('/users/' + id);
      main.innerHTML =
        '<button class="back-link" id="detBack"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>返回列表</button>' +
        '<div class="detail-header">' +
          (u.avatar ? '<img class="detail-avatar" src="' + u.avatar + '" alt="">' : '<div class="detail-avatar-placeholder">' + escapeHtml(u.name.charAt(0)) + '</div>') +
          '<div><div class="detail-name">' + escapeHtml(u.name) + '</div><div class="detail-id">' + escapeHtml(u.student_id) + '</div></div></div>' +
        '<div class="detail-grid">' +
          '<div class="detail-field"><div class="label">毕业届数</div><div class="value">' + escapeHtml(u.graduate_year) + ' 届</div></div>' +
          '<div class="detail-field"><div class="label">家庭地址</div><div class="value">' + (u.address || '-') + '</div></div>' +
          '<div class="detail-field"><div class="label">当前职业/状态</div><div class="value">' + (u.occupation || '-') + '</div></div>' +
          '<div class="detail-field"><div class="label">性别</div><div class="value">' + (u.gender || '-') + '</div></div>' +
          '<div class="detail-field"><div class="label">手机号</div><div class="value">' + (u.phone || '-') + '</div></div>' +
          '<div class="detail-field"><div class="label">邮箱</div><div class="value">' + (u.email || '-') + '</div></div>' +
          '<div class="detail-field"><div class="label">角色</div><div class="value"><span class="badge ' + (u.role === 'admin' ? 'badge-admin' : 'badge-user') + '">' + (u.role === 'admin' ? '管理员' : '普通用户') + '</span></div></div>' +
          '<div class="detail-field"><div class="label">状态</div><div class="value"><span class="badge ' + (u.status === 0 ? 'badge-disabled' : 'badge-active') + '">' + (u.status === 0 ? '已禁用' : '正常') + '</span></div></div>' +
          '<div class="detail-field"><div class="label">注册时间</div><div class="value">' + formatTime(u.create_time) + '</div></div>' +
          '<div class="detail-field"><div class="label">最后登录</div><div class="value">' + formatTime(u.last_login_time) + '</div></div>' +
        '</div>';
      document.getElementById('detBack').addEventListener('click', function () { navigate('dashboard'); });
    } catch (err) { main.innerHTML = '<div class="empty-state"><p>加载失败: ' + err.message + '</p></div>'; }
  }

  // Admin
  var adminTab = 'users';
  function renderAdmin() {
    main.innerHTML =
      '<div class="page-header"><h2>管理后台</h2></div>' +
      '<div class="admin-tabs"><button class="admin-tab' + (adminTab === 'users' ? ' active' : '') + '" data-tab="users">用户管理</button><button class="admin-tab' + (adminTab === 'stats' ? ' active' : '') + '" data-tab="stats">数据统计</button></div><div id="adminContent"></div>';
    document.querySelectorAll('.admin-tab').forEach(function (t) {
      t.addEventListener('click', function () { adminTab = t.dataset.tab; renderAdmin(); });
    });
    if (adminTab === 'users') renderAdminUsers();
    else renderAdminStats();
  }

  async function renderAdminUsers() {
    var ct = document.getElementById('adminContent');
    ct.innerHTML = '<div><input type="text" id="auSearch" placeholder="搜索姓名或学号..." style="width:300px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;margin-bottom:16px"></div><div class="table-wrap"><table id="auTable"><thead><tr><th>姓名</th><th>学号</th><th>届别</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th></tr></thead><tbody id="auBody"></tbody></table></div>';
    document.getElementById('auSearch').addEventListener('input', debounce(loadAdminUsers, 300));
    loadAdminUsers();
  }

  async function loadAdminUsers() {
    var search = document.getElementById('auSearch') ? document.getElementById('auSearch').value : '';
    try {
      var data = await api('/users?search=' + encodeURIComponent(search) + '&pageSize=200');
      var tbody = document.getElementById('auBody');
      tbody.innerHTML = data.list.map(function (u) {
        return '<tr><td>' + escapeHtml(u.name) + '</td><td>' + escapeHtml(u.student_id) + '</td><td>' + escapeHtml(u.graduate_year) + '</td><td><span class="badge ' + (u.role === 'admin' ? 'badge-admin' : 'badge-user') + '">' + (u.role === 'admin' ? '管理员' : '用户') + '</span></td><td><span class="badge ' + (u.status === 0 ? 'badge-disabled' : 'badge-active') + '">' + (u.status === 0 ? '禁用' : '正常') + '</span></td><td>' + formatTime(u.create_time) + '</td><td><div class="table-actions">' +
          (u.role !== 'admin' ? '<button class="btn btn-sm btn-outline au-toggle" data-id="' + u.id + '" data-st="' + u.status + '">' + (u.status === 1 ? '禁用' : '启用') + '</button>' : '') +
          (u.role !== 'admin' ? '<button class="btn btn-sm btn-outline au-reset" data-id="' + u.id + '" data-name="' + escapeHtml(u.name) + '">重置密码</button>' : '') +
          (u.role !== 'admin' ? '<button class="btn btn-sm btn-danger au-delete" data-id="' + u.id + '" data-name="' + escapeHtml(u.name) + '">删除</button>' : '') +
        '</div></td></tr>';
      }).join('');
      tbody.querySelectorAll('.au-toggle').forEach(function (b) {
        b.addEventListener('click', async function () {
          try { await api('/users/' + b.dataset.id + '/status', { method: 'PUT' }); showToast('状态已更新', 'success'); loadAdminUsers(); }
          catch (err) { showToast(err.message, 'error'); }
        });
      });
      tbody.querySelectorAll('.au-reset').forEach(function (b) {
        b.addEventListener('click', function () {
          showModal('重置密码', '<p>确定将 <strong>' + b.dataset.name + '</strong> 的密码重置为 <code>123456</code> 吗？</p>', async function () {
            try { await api('/users/' + b.dataset.id + '/reset-password', { method: 'POST' }); showToast('密码已重置为 123456', 'success'); }
            catch (err) { showToast(err.message, 'error'); }
          });
        });
      });
      tbody.querySelectorAll('.au-delete').forEach(function (b) {
        b.addEventListener('click', function () {
          showModal('删除用户', '<p>确定要删除 <strong>' + b.dataset.name + '</strong> 吗？此操作不可撤销。</p>', async function () {
            try { await api('/users/' + b.dataset.id, { method: 'DELETE' }); showToast('已删除', 'success'); loadAdminUsers(); }
            catch (err) { showToast(err.message, 'error'); }
          }, '删除');
        });
      });
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function renderAdminStats() {
    var ct = document.getElementById('adminContent');
    ct.innerHTML = '<p>加载中...</p>';
    try {
      var s = await api('/admin/stats');
      var byYearHtml = '';
      var maxVal = 1;
      Object.values(s.byYear).forEach(function (v) { if (v > maxVal) maxVal = v; });
      Object.keys(s.byYear).sort().forEach(function (y) {
        var v = s.byYear[y];
        var h = Math.max(4, (v / maxVal) * 120);
        byYearHtml += '<div class="bar-item"><div class="bar-value">' + v + '</div><div class="bar" style="height:' + h + 'px"></div><div class="bar-label">' + y + '</div></div>';
      });
      var loginHtml = s.recentLogins.map(function (l) {
        return '<tr><td>' + escapeHtml(l.user_name) + '</td><td>' + escapeHtml(l.user_student_id) + '</td><td>' + formatTime(l.login_time) + '</td></tr>';
      }).join('');
      ct.innerHTML =
        '<div class="stats-grid">' +
          '<div class="stat-card"><div class="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="stat-value">' + s.total + '</div><div class="stat-label">总用户数</div></div></div>' +
          '<div class="stat-card"><div class="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="stat-value">' + s.recent + '</div><div class="stat-label">近30天新增</div></div></div>' +
          '<div class="stat-card"><div class="stat-icon amber"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="stat-value">' + s.activeToday + '</div><div class="stat-label">今日活跃</div></div></div>' +
          '<div class="stat-card"><div class="stat-icon red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div><div><div class="stat-value">' + (s.byRole.admin || 0) + '</div><div class="stat-label">管理员</div></div></div>' +
        '</div>' +
        (byYearHtml ? '<div class="chart-section"><h3>各届人数分布</h3><div class="bar-chart">' + byYearHtml + '</div></div>' : '') +
        (loginHtml ? '<div class="log-table"><h3>最近登录记录</h3><div class="table-wrap"><table><thead><tr><th>姓名</th><th>学号</th><th>登录时间</th></tr></thead><tbody>' + loginHtml + '</tbody></table></div></div>' : '');
    } catch (err) { ct.innerHTML = '<p>加载失败: ' + err.message + '</p>'; }
  }


  // Forum list
  async function renderForum() {
    main.innerHTML = '<div class="page-header"><h2>论坛交流</h2><button class="btn btn-primary" id="forumNewBtn" style="width:auto">发新帖</button></div><div id="forumList"></div>';
    document.getElementById('forumNewBtn').addEventListener('click', function () { navigate('forum/new'); });
    loadForumList();
  }

  async function loadForumList() {
    var ct = document.getElementById('forumList');
    try {
      var posts = await api('/posts');
      if (posts.length === 0) {
        ct.innerHTML = '<div class="empty-state"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>暂无帖子，来发第一个吧</p></div>';
        return;
      }
      ct.innerHTML = posts.map(function (p) {
        var av = p.author_avatar ? '<img src="' + p.author_avatar + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">' : '<div style="width:36px;height:36px;border-radius:50%;background:#dbeafe;color:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0">' + escapeHtml(p.author_name.charAt(0)) + '</div>';
        return '<div class="forum-post" data-id="' + p.id + '" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;margin-bottom:12px;cursor:pointer;transition:.15s;display:flex;gap:14px"><div>' + av + '</div><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;margin-bottom:4px">' + escapeHtml(p.title) + '</div><div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(p.content.substring(0, 100)) + '</div><div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)"><span>' + escapeHtml(p.author_name) + '</span><span>' + formatTime(p.create_time) + '</span><span>' + p.comment_count + ' 条回复</span></div></div></div>';
      }).join('');
      ct.querySelectorAll('.forum-post').forEach(function (el) { el.addEventListener('click', function () { navigate('forum/' + el.dataset.id); }); });
    } catch (err) { showToast(err.message, 'error'); }
  }

  // Forum new post
  function renderForumNew() {
    main.innerHTML =
      '<button class="back-link" id="fnBack"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>返回论坛</button>' +
      '<div style="max-width:700px"><h2 style="font-size:20px;font-weight:600;margin-bottom:20px">发布新帖</h2>' +
      '<div class="form-group"><label>标题</label><input type="text" id="fnTitle" placeholder="请输入标题" maxlength="100"></div>' +
      '<div class="form-group"><label>内容</label><textarea id="fnContent" placeholder="请输入内容..." rows="6" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;resize:vertical;outline:none"></textarea></div>' +
      '<div id="fnMsg" class="form-msg"></div>' +
      '<button class="btn btn-primary" id="fnSubmit" style="width:auto">发布</button></div>';
    document.getElementById('fnBack').addEventListener('click', function () { navigate('forum'); });
    document.getElementById('fnSubmit').addEventListener('click', async function () {
      var title = document.getElementById('fnTitle').value.trim();
      var content = document.getElementById('fnContent').value.trim();
      var msg = document.getElementById('fnMsg');
      if (!title || !content) { msg.textContent = '标题和内容不能为空'; msg.className = 'form-msg error'; return; }
      var btn = document.getElementById('fnSubmit'); btn.disabled = true; btn.textContent = '发布中...';
      try { await api('/posts', { method: 'POST', body: { title: title, content: content } }); showToast('发布成功', 'success'); navigate('forum'); }
      catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
      finally { btn.disabled = false; btn.textContent = '发布'; }
    });
  }

  // Forum detail
  async function renderForumDetail(id) {
    main.innerHTML = '<div class="empty-state"><p>加载中...</p></div>';
    try {
      var p = await api('/posts/' + id);
      var av = p.author_avatar ? '<img src="' + p.author_avatar + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover">' : '<div style="width:40px;height:40px;border-radius:50%;background:#dbeafe;color:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600">' + escapeHtml(p.author_name.charAt(0)) + '</div>';
      var canDeletePost = (currentUser.role === 'admin' || p.user_id === currentUser.id);
      var commentsHtml = p.comments.map(function (c) {
        var cav = c.author_avatar ? '<img src="' + c.author_avatar + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">' : '<div style="width:32px;height:32px;border-radius:50%;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0">' + escapeHtml(c.author_name.charAt(0)) + '</div>';
        var canDeleteComment = (currentUser.role === 'admin' || c.user_id === currentUser.id);
        return '<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)">' + cav +
          '<div style="flex:1"><div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span style="font-weight:600;font-size:13px">' + escapeHtml(c.author_name) + '</span><span style="font-size:11px;color:var(--text-muted)">' + formatTime(c.create_time) + '</span></div>' +
          '<div style="font-size:14px;line-height:1.6">' + escapeHtml(c.content) + '</div></div>' +
          (canDeleteComment ? '<button class="fc-del" data-cid="' + c.id + '" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:0 4px;flex-shrink:0" title="删除">&times;</button>' : '') +
        '</div>';
      }).join('');

      main.innerHTML =
        '<button class="back-link" id="fdBack"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>返回论坛</button>' +
        '<div style="max-width:750px"><div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:24px">' + av +
          '<div style="flex:1"><h2 style="font-size:20px;font-weight:600;margin-bottom:6px">' + escapeHtml(p.title) + '</h2>' +
          '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">' + escapeHtml(p.author_name) + ' · ' + formatTime(p.create_time) + '</div>' +
          '<div style="font-size:14px;line-height:1.8;white-space:pre-wrap;margin-bottom:12px">' + escapeHtml(p.content) + '</div>' +
          (canDeletePost ? '<button class="btn btn-sm btn-outline" id="fdDelPost" style="color:var(--danger);border-color:var(--danger)">删除帖子</button>' : '') +
        '</div></div>' +
        '<div style="border-top:2px solid var(--border);padding-top:20px"><h3 style="font-size:16px;font-weight:600;margin-bottom:16px">回复 (' + p.comments.length + ')</h3>' +
        (commentsHtml || '<div style="color:var(--text-muted);font-size:13px;padding:20px 0">暂无回复，来说两句吧</div>') +
        '</div>' +
        '<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px"><textarea id="fcInput" placeholder="输入回复内容..." rows="3" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;resize:vertical;outline:none"></textarea><div id="fcMsg" class="form-msg"></div><button class="btn btn-primary" id="fcSubmit" style="width:auto;margin-top:8px">发表回复</button></div></div>';

      document.getElementById('fdBack').addEventListener('click', function () { navigate('forum'); });
      document.getElementById('fcSubmit').addEventListener('click', async function () {
        var content = document.getElementById('fcInput').value.trim();
        var msg = document.getElementById('fcMsg');
        if (!content) { msg.textContent = '请输入回复内容'; msg.className = 'form-msg error'; return; }
        var btn = document.getElementById('fcSubmit'); btn.disabled = true; btn.textContent = '发送中...';
        try { await api('/posts/' + id + '/comments', { method: 'POST', body: { content: content } }); renderForumDetail(id); }
        catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
        finally { btn.disabled = false; btn.textContent = '发表回复'; }
      });
      if (canDeletePost) {
        document.getElementById('fdDelPost').addEventListener('click', function () {
          showModal('删除帖子', '<p>确定要删除这个帖子吗？所有回复也将被删除。</p>', async function () {
            try { await api('/posts/' + id, { method: 'DELETE' }); showToast('已删除', 'success'); navigate('forum'); }
            catch (err) { showToast(err.message, 'error'); }
          }, '删除');
        });
      }
      document.querySelectorAll('.fc-del').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation();
          showModal('删除回复', '<p>确定要删除这条回复吗？</p>', async function () {
            try { await api('/posts/' + id + '/comments/' + b.dataset.cid, { method: 'DELETE' }); renderForumDetail(id); }
            catch (err) { showToast(err.message, 'error'); }
          }, '删除');
        });
      });
    } catch (err) { main.innerHTML = '<div class="empty-state"><p>加载失败: ' + err.message + '</p></div>'; }
  }

  // Router
  async function checkAuth() {
    if (!token) return false;
    try { currentUser = await api('/auth/me'); return true; }
    catch (_) { setToken(null); return false; }
  }

  async function route() {
    var r = getRoute();
    if (r.page === 'login' || r.page === 'register') {
      if (token && await checkAuth()) { navigate('dashboard'); return; }
      renderNavbar(r);
      if (r.page === 'login') renderLogin(); else renderRegister();
      return;
    }
    if (!token || !(await checkAuth())) { navigate('login'); return; }
    renderNavbar(r);
    if (r.page === 'dashboard') renderDashboard();
    else if (r.page === 'profile') renderProfile();
    else if (r.page === 'detail' && r.id) renderDetail(r.id);
    else if (r.page === 'forum' && r.id === 'new') renderForumNew();
    else if (r.page === 'forum' && r.id && r.id !== 'new') renderForumDetail(r.id);
    else if (r.page === 'forum') renderForum();
    else if (r.page === 'admin') renderAdmin();
    else navigate('dashboard');
  }

  window.addEventListener('hashchange', route);
  route();
})();
