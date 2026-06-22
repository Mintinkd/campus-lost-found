function getApiBase() {
  if (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) {
    return window.__APP_CONFIG__.API_BASE;
  }
  if (window.API_BASE) {
    return window.API_BASE;
  }
  return '/api/v1';
}

var API_BASE = getApiBase();
var _appReady = false;
var _readyCallbacks = [];

function onAppReady(cb) {
  if (_appReady) cb();
  else _readyCallbacks.push(cb);
}

function markAppReady() {
  _appReady = true;
  _readyCallbacks.forEach(function(cb) { cb(); });
  _readyCallbacks = [];
}

let token = localStorage.getItem('token') || '';
let currentUser = null;

async function api(path, options = {}) {
  API_BASE = getApiBase();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('网络连接失败，请检查网络或后端服务是否启动');
  }

  if (res.status === 502) {
    throw new Error('服务暂时不可用(502)，请稍后重试');
  }

  if (!res.ok && res.headers.get('content-type') && !res.headers.get('content-type').includes('application/json')) {
    var errorText = await res.text().catch(function() { return ''; });
    if (res.status === 404) {
      throw new Error('API地址不存在(404)，请检查API_BASE配置: ' + API_BASE);
    }
    throw new Error('请求失败(' + res.status + '): ' + errorText.substring(0, 200));
  }

  const data = await res.json();

  if (data.code === 0) return data.data;
  if (data.code === 1001 || data.code === 1002) {
    token = '';
    localStorage.removeItem('token');
    currentUser = null;
    throw new Error(data.message);
  }
  throw new Error(data.message);
}

async function apiUpload(path, formData) {
  API_BASE = getApiBase();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData
    });
  } catch (networkErr) {
    throw new Error('网络连接失败，请检查网络或后端服务是否启动');
  }

  if (res.status === 502) {
    throw new Error('服务暂时不可用(502)，请稍后重试');
  }

  const data = await res.json();
  if (data.code === 0) return data.data;
  throw new Error(data.message);
}

async function login(email, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  updateAuthUI();
  return data;
}

async function register(email, password, nickname) {
  const data = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname })
  });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  updateAuthUI();
  return data;
}

function logout() {
  token = '';
  currentUser = null;
  localStorage.removeItem('token');
  updateAuthUI();
  navigate('home');
}

async function loadProfile() {
  if (!token) return;
  try {
    currentUser = await api('/auth/profile');
    updateAuthUI();
  } catch (e) {
    token = '';
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
  }
}

function updateAuthUI() {
  const userInfo = document.getElementById('user-info');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');

  if (currentUser) {
    userInfo.textContent = currentUser.nickname;
    userInfo.style.display = 'inline';
    btnLogin.style.display = 'none';
    btnLogout.style.display = 'inline';
  } else {
    userInfo.style.display = 'none';
    btnLogin.style.display = 'inline';
    btnLogout.style.display = 'none';
  }
}

function requireAuth() {
  if (!token) {
    showLogin();
    return false;
  }
  return true;
}

function showModal(html) {
  document.getElementById('modal-overlay').style.display = 'block';
  const modal = document.getElementById('modal');
  modal.innerHTML = html;
  modal.style.display = 'block';
}

function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
}

document.getElementById('modal-overlay').addEventListener('click', hideModal);

function showLogin() {
  showModal(`
    <h3>登录 / 注册</h3>
    <div class="form-group">
      <label class="form-label">邮箱</label>
      <input type="email" id="login-email" class="form-input" placeholder="your@email.com">
    </div>
    <div class="form-group">
      <label class="form-label">密码</label>
      <input type="password" id="login-password" class="form-input" placeholder="至少6位">
    </div>
    <div class="form-group" id="register-nickname-group" style="display:none">
      <label class="form-label">昵称</label>
      <input type="text" id="login-nickname" class="form-input" placeholder="你的昵称">
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="hideModal()">取消</button>
      <button class="btn btn-primary" onclick="doLogin()">登录</button>
      <button class="btn btn-outline" onclick="toggleRegister()" id="btn-toggle-register">注册</button>
    </div>
  `);
}

let isRegisterMode = false;
function toggleRegister() {
  isRegisterMode = !isRegisterMode;
  const group = document.getElementById('register-nickname-group');
  const btn = document.getElementById('btn-toggle-register');
  if (isRegisterMode) {
    group.style.display = 'block';
    btn.textContent = '返回登录';
  } else {
    group.style.display = 'none';
    btn.textContent = '注册';
  }
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    if (isRegisterMode) {
      const nickname = document.getElementById('login-nickname').value;
      await register(email, password, nickname);
    } else {
      await login(email, password);
    }
    hideModal();
    navigate(currentPage || 'home');
  } catch (e) {
    alert(e.message);
  }
}