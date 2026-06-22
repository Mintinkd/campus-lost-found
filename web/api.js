function getApiBase() {
  if (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) {
    return window.__APP_CONFIG__.API_BASE;
  }
  if (window.API_BASE) return window.API_BASE;
  return '';
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

var _wakingBackend = null;

function wakeBackend(url) {
  if (_wakingBackend) return _wakingBackend;
  _wakingBackend = new Promise(function(resolve) {
    var tries = 0;
    var maxTries = 6;
    var delay = 3000;

    function attempt() {
      tries++;
      fetch(url, { method: 'GET', mode: 'cors' }).then(function(res) {
        if (res.ok || res.status === 401 || res.status === 404) {
          _wakingBackend = null;
          resolve(true);
        } else if (tries < maxTries) {
          setTimeout(attempt, delay);
        } else {
          _wakingBackend = null;
          resolve(false);
        }
      }).catch(function() {
        if (tries < maxTries) {
          setTimeout(attempt, delay);
        } else {
          _wakingBackend = null;
          resolve(false);
        }
      });
    }

    attempt();
  });
  return _wakingBackend;
}

async function api(path, options) {
  options = options || {};
  API_BASE = getApiBase();

  if (!API_BASE) {
    showBackendConfigError();
    throw new Error('后端地址未配置');
  }

  var url = API_BASE.replace(/\/+$/, '') + path;
  var headers = { 'Content-Type': 'application/json' };
  if (options.headers) {
    for (var h in options.headers) {
      if (options.headers.hasOwnProperty(h)) headers[h] = options.headers[h];
    }
  }
  if (token) headers['Authorization'] = 'Bearer ' + token;

  var res;
  try {
    res = await fetch(url, { method: options.method || 'GET', headers: headers, body: options.body });
  } catch (networkErr) {
    var woke = await wakeBackend(url);
    if (woke) {
      try {
        res = await fetch(url, { method: options.method || 'GET', headers: headers, body: options.body });
      } catch (e) {
        showBackendConfigError();
        throw new Error('无法连接后端服务: ' + API_BASE);
      }
    } else {
      showBackendConfigError();
      throw new Error('无法连接后端服务: ' + API_BASE);
    }
  }

  if (res.status === 502 || res.status === 503) {
    showWakingBackend();
    var woke = await wakeBackend(url);
    if (woke) {
      try {
        res = await fetch(url, { method: options.method || 'GET', headers: headers, body: options.body });
      } catch (e) {
        throw new Error('后端服务唤醒后仍无法访问');
      }
      if (res.status === 502 || res.status === 503) {
        throw new Error('后端服务正在启动，请稍后刷新页面重试');
      }
    } else {
      throw new Error('后端服务暂时不可用，请稍后重试');
    }
  }

  var contentType = res.headers.get('content-type') || '';
  if (contentType.indexOf('application/json') === -1) {
    if (res.status === 404) {
      showBackendConfigError();
      throw new Error('API地址不存在(404): ' + url);
    }
    throw new Error('服务器返回非JSON响应(' + res.status + ')');
  }

  var data = await res.json();

  if (data.code === 0) return data.data;

  if (data.code === 1001 || data.code === 1002) {
    token = '';
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
  }

  throw new Error(data.message || '请求失败(code:' + data.code + ')');
}

async function apiUpload(path, formData) {
  API_BASE = getApiBase();
  if (!API_BASE) {
    showBackendConfigError();
    throw new Error('后端地址未配置');
  }

  var url = API_BASE.replace(/\/+$/, '') + path;
  var headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;

  var res;
  try {
    res = await fetch(url, { method: 'POST', headers: headers, body: formData });
  } catch (networkErr) {
    showBackendConfigError();
    throw new Error('无法连接后端服务');
  }

  if (res.status === 502 || res.status === 503) {
    showWakingBackend();
    var woke = await wakeBackend(url);
    if (woke) {
      res = await fetch(url, { method: 'POST', headers: headers, body: formData });
    } else {
      throw new Error('后端服务暂时不可用');
    }
  }

  var contentType = res.headers.get('content-type') || '';
  if (contentType.indexOf('application/json') === -1) {
    throw new Error('上传响应异常(' + res.status + ')');
  }

  var data = await res.json();
  if (data.code === 0) return data.data;
  throw new Error(data.message || '上传失败');
}

function showBackendConfigError() {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '<div class="card" style="text-align:center;padding:40px">' +
    '<h2 style="color:#FA5151;margin-bottom:16px">\u26a0\ufe0f 后端服务未连接</h2>' +
    '<p style="color:#666;margin-bottom:12px">前端无法连接到后端 API，请检查以下配置：</p>' +
    '<div style="text-align:left;background:#f5f5f5;padding:16px;border-radius:8px;font-size:14px;color:#333">' +
    '<p><strong>1. 确认后端服务已启动</strong></p>' +
    '<p>在浏览器直接访问后端健康检查接口，确认返回 {"code":0}</p>' +
    '<p style="margin-bottom:12px">例如: https://your-app.onrender.com/api/v1/health</p>' +
    '<p><strong>2. 配置 API_BASE 地址</strong></p>' +
    '<p>在 index.html 中找到配置区域，设置后端地址：</p>' +
    '<pre style="background:#fff;padding:8px;border-radius:4px;margin-top:4px">window.__APP_CONFIG__.API_BASE = \'https://your-app.onrender.com/api/v1\';</pre>' +
    '</div>' +
    '<button class="btn btn-primary" style="margin-top:16px" onclick="location.reload()">重新加载</button>' +
    '</div>';
}

function showWakingBackend() {
  var app = document.getElementById('app');
  if (!app) return;
  var existing = app.querySelector('.waking-notice');
  if (existing) return;
  var notice = document.createElement('div');
  notice.className = 'waking-notice';
  notice.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#FFF3E0;color:#E65100;padding:10px 20px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.15)';
  notice.textContent = '\u23f3 后端服务正在唤醒中，请稍候...';
  document.body.appendChild(notice);
  setTimeout(function() { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 30000);
}

async function login(email, password) {
  var data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email, password: password })
  });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  updateAuthUI();
  return data;
}

async function register(email, password, nickname) {
  var data = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email, password: password, nickname: nickname })
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
  var userInfo = document.getElementById('user-info');
  var btnLogin = document.getElementById('btn-login');
  var btnLogout = document.getElementById('btn-logout');
  if (!userInfo || !btnLogin || !btnLogout) return;

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
  var modal = document.getElementById('modal');
  modal.innerHTML = html;
  modal.style.display = 'block';
}

function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
}

function showLogin() {
  showModal(
    '<h3>登录 / 注册</h3>' +
    '<div class="form-group"><label class="form-label">邮箱</label><input type="email" id="login-email" class="form-input" placeholder="your@email.com"></div>' +
    '<div class="form-group"><label class="form-label">密码</label><input type="password" id="login-password" class="form-input" placeholder="至少6位"></div>' +
    '<div class="form-group" id="register-nickname-group" style="display:none"><label class="form-label">昵称</label><input type="text" id="login-nickname" class="form-input" placeholder="你的昵称"></div>' +
    '<div class="modal-actions">' +
    '<button class="btn btn-outline" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-primary" onclick="doLogin()">登录</button>' +
    '<button class="btn btn-outline" onclick="toggleRegister()" id="btn-toggle-register">注册</button>' +
    '</div>'
  );
}

var isRegisterMode = false;
function toggleRegister() {
  isRegisterMode = !isRegisterMode;
  var group = document.getElementById('register-nickname-group');
  var btn = document.getElementById('btn-toggle-register');
  if (isRegisterMode) {
    group.style.display = 'block';
    btn.textContent = '返回登录';
  } else {
    group.style.display = 'none';
    btn.textContent = '注册';
  }
}

async function doLogin() {
  var email = document.getElementById('login-email').value;
  var password = document.getElementById('login-password').value;
  try {
    if (isRegisterMode) {
      var nickname = document.getElementById('login-nickname').value;
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
