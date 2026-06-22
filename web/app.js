var currentPage = 'home';

document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    navigate(link.dataset.page);
  });
});

document.getElementById('modal-overlay').addEventListener('click', hideModal);

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
  var active = document.querySelector('.nav-link[data-page="' + page + '"]');
  if (active) active.classList.add('active');

  switch (page) {
    case 'home': renderHome(); break;
    case 'upload': renderUpload(); break;
    case 'search': renderSearch(); break;
    case 'mine': renderMine(); break;
  }
}

async function renderHome() {
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="hero">' +
    '<h1>校园失物招领</h1>' +
    '<p>AI智能识别 · 语义搜索 · 快速匹配</p>' +
    '<div class="hero-actions">' +
    '<button class="btn" style="background:rgba(255,255,255,0.2);color:#fff" onclick="navigate(\'upload\')">📷 我捡到了</button>' +
    '<button class="btn" style="background:rgba(255,255,255,0.2);color:#fff" onclick="navigate(\'search\')">🔍 我丢了东西</button>' +
    '</div>' +
    '</div>' +
    '<div class="section-title">最近拾物</div>' +
    '<div id="recent-items" class="item-list">' +
    '<div class="empty-state"><div class="icon">⏳</div><div>加载中...</div></div>' +
    '</div>';

  if (!API_BASE) {
    document.getElementById('recent-items').innerHTML =
      '<div class="empty-state"><div class="icon">📭</div><div>后端地址未配置，请设置 API_BASE</div></div>';
    return;
  }

  try {
    var data = await api('/items?pageSize=12&status=pending');
    var container = document.getElementById('recent-items');
    if (!data.list || data.list.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><div>暂无拾物信息</div></div>';
      return;
    }
    container.innerHTML = data.list.map(function(item) {
      return '<div class="card item-card" onclick="showDetail(\'' + item.id + '\')">' +
        '<div class="item-photo">' +
        (item.photos && item.photos.length > 0
          ? '<img src="' + item.photos[0] + '" alt="' + item.category + '">'
          : '<div style="width:100%;height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:40px">📦</div>') +
        '</div>' +
        '<div class="item-meta"><span class="tag">' + item.category + '</span> <span class="status-badge status-' + item.status + '">' + statusText(item.status) + '</span></div>' +
        '<div class="item-location">📍 ' + item.location + '</div>' +
        '<div class="item-time">' + formatTime(item.foundTime) + '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    document.getElementById('recent-items').innerHTML =
      '<div class="empty-state"><div class="icon">⚠️</div><div>加载失败: ' + e.message + '</div></div>';
  }
}

function renderUpload() {
  if (!requireAuth()) return;
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="card">' +
    '<div class="section-title">📸 上传照片</div>' +
    '<div class="photo-grid" id="photo-grid">' +
    '<div class="photo-add" onclick="document.getElementById(\'photo-input\').click()">' +
    '<div style="font-size:32px">+</div><div>添加照片</div></div>' +
    '</div>' +
    '<input type="file" id="photo-input" accept="image/jpeg,image/png" multiple style="display:none" onchange="handlePhotos(this)">' +
    '</div>' +
    '<div class="card">' +
    '<div class="section-title">📝 物品信息</div>' +
    '<div class="form-group"><label class="form-label">物品类别</label><select id="item-category" class="form-select"><option value="">请选择类别</option></select></div>' +
    '<div class="form-group"><label class="form-label">拾到地点 *</label><input type="text" id="item-location" class="form-input" placeholder="如：图书馆二楼"></div>' +
    '<div class="form-group"><label class="form-label">拾到时间 *</label><input type="datetime-local" id="item-time" class="form-input"></div>' +
    '<div class="form-group"><label class="form-label">补充描述</label><textarea id="item-desc" class="form-textarea" placeholder="如：蓝色折叠伞，把手处有划痕"></textarea></div>' +
    '</div>' +
    '<button class="btn btn-primary btn-block" onclick="submitItem()" id="btn-submit">提交上报</button>';

  loadCategories();
  document.getElementById('item-time').value = new Date().toISOString().slice(0, 16);
}

var uploadedPhotos = [];

function handlePhotos(input) {
  var files = Array.from(input.files);
  if (uploadedPhotos.length + files.length > 5) { alert('最多上传5张照片'); return; }
  files.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      uploadedPhotos.push({ file: file, preview: e.target.result });
      renderPhotoGrid();
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoGrid() {
  var grid = document.getElementById('photo-grid');
  if (!grid) return;
  grid.innerHTML = uploadedPhotos.map(function(p, i) {
    return '<div class="photo-item"><img src="' + p.preview + '" alt="照片' + (i+1) + '">' +
      '<button style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px" onclick="removePhoto(' + i + ')">✕</button></div>';
  }).join('') + (uploadedPhotos.length < 5 ? '<div class="photo-add" onclick="document.getElementById(\'photo-input\').click()"><div style="font-size:32px">+</div><div>添加照片</div></div>' : '');
}

function removePhoto(index) { uploadedPhotos.splice(index, 1); renderPhotoGrid(); }

async function loadCategories() {
  try {
    var cats = await api('/items/categories');
    var select = document.getElementById('item-category');
    cats.forEach(function(c) { var opt = document.createElement('option'); opt.value = c; opt.textContent = c; select.appendChild(opt); });
  } catch (e) { console.error(e); }
}

async function submitItem() {
  if (uploadedPhotos.length === 0) { alert('请上传至少一张照片'); return; }
  var location = document.getElementById('item-location').value.trim();
  if (!location) { alert('请填写拾到地点'); return; }
  var foundTime = document.getElementById('item-time').value;
  if (!foundTime) { alert('请选择拾到时间'); return; }
  var btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = '提交中...';
  try {
    var formData = new FormData();
    uploadedPhotos.forEach(function(p) { formData.append('photos', p.file); });
    formData.append('category', document.getElementById('item-category').value || '其他');
    formData.append('location', location);
    formData.append('foundTime', foundTime);
    formData.append('description', document.getElementById('item-desc').value.trim());
    await apiUpload('/items', formData);
    alert('上报成功！');
    uploadedPhotos = [];
    navigate('home');
  } catch (e) { alert('提交失败: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = '提交上报'; }
}

function renderSearch() {
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="search-bar">' +
    '<input type="text" id="search-input" placeholder="描述你丢失的物品，如：上周在图书馆丢了一把蓝色雨伞" onkeydown="if(event.key===\'Enter\')doSearch()">' +
    '<button class="btn btn-primary" onclick="doSearch()">搜索</button>' +
    '</div>' +
    '<div id="parse-result" class="parse-result" style="display:none"></div>' +
    '<div id="search-results"></div>';
}

async function doSearch() {
  if (!requireAuth()) return;
  var text = document.getElementById('search-input').value.trim();
  if (!text) { alert('请输入失物描述'); return; }
  document.getElementById('search-results').innerHTML = '<div class="empty-state"><div class="icon">⏳</div><div>智能匹配中...</div></div>';
  try {
    var result = await api('/search', { method: 'POST', body: JSON.stringify({ searchText: text }) });
    if (result.dimensions) {
      var dims = result.dimensions;
      var parseEl = document.getElementById('parse-result');
      var html = 'AI解析：';
      if (dims.category) html += ' <span class="tag">' + dims.category + '</span>';
      if (dims.location) html += ' <span class="tag tag-warning">' + dims.location + '</span>';
      if (dims.time) html += ' <span class="tag">' + dims.time.raw + '</span>';
      if (dims.color) html += ' <span class="tag">' + dims.color + '</span>';
      parseEl.innerHTML = html;
      parseEl.style.display = 'flex';
    }
    var container = document.getElementById('search-results');
    if (result.results.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><div>未找到匹配物品</div></div>';
      return;
    }
    container.innerHTML = '<div style="font-size:14px;color:#666;margin-bottom:12px">找到 ' + result.total + ' 个匹配</div>' +
      result.results.map(function(r) {
        return '<div class="card result-card" onclick="showDetail(\'' + r.item.id + '\')">' +
          '<div class="result-photo">' +
          (r.item.photos && r.item.photos.length > 0 ? '<img src="' + r.item.photos[0] + '">' : '<div style="width:100%;height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:32px">📦</div>') +
          '</div><div class="result-info">' +
          '<div class="result-meta"><span class="tag">' + r.item.category + '</span> <span class="match-score">' + r.matchScore + '% 匹配</span></div>' +
          '<div class="result-location">📍 ' + r.item.location + '</div>' +
          '<div class="result-time">' + formatTime(r.item.foundTime) + '</div>' +
          (r.item.description ? '<div style="font-size:13px;color:#999;margin-top:4px">' + r.item.description + '</div>' : '') +
          '</div></div>';
      }).join('');
  } catch (e) {
    document.getElementById('search-results').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div>' + e.message + '</div></div>';
  }
}

async function showDetail(id) {
  try {
    var item = await api('/items/' + id);
    var isOwner = currentUser && item.finderId === currentUser.id;
    var canClaim = !isOwner && (item.status === 'pending' || item.status === 'claiming');
    var html = '<h3>物品详情</h3>';
    if (item.photos && item.photos.length > 0) html += '<div class="detail-photos"><img src="' + item.photos[0] + '"></div>';
    html += '<div class="detail-row"><span class="detail-label">类别</span><span class="detail-value"><span class="tag">' + item.category + '</span> <span class="status-badge status-' + item.status + '">' + statusText(item.status) + '</span></span></div>';
    html += '<div class="detail-row"><span class="detail-label">地点</span><span class="detail-value">📍 ' + item.location + '</span></div>';
    html += '<div class="detail-row"><span class="detail-label">时间</span><span class="detail-value">🕐 ' + formatTime(item.foundTime) + '</span></div>';
    if (item.description) html += '<div class="detail-row"><span class="detail-label">描述</span><span class="detail-value">' + item.description + '</span></div>';
    if (item.confidence) html += '<div class="detail-row"><span class="detail-label">AI置信度</span><span class="detail-value">' + item.confidence + '%</span></div>';
    html += '<div class="detail-row"><span class="detail-label">拾物者</span><span class="detail-value">' + (item.finder ? item.finder.nickname || '未知' : '未知') + '</span></div>';
    if (canClaim) html += '<div class="form-group" style="margin-top:16px"><label class="form-label">认领说明 *</label><textarea id="claim-reason" class="form-textarea" placeholder="请描述物品特征以验证身份"></textarea></div>';
    if (isOwner && item.claims && item.claims.length > 0) {
      html += '<div style="margin-top:16px"><div class="section-title">认领申请</div>';
      item.claims.forEach(function(c) {
        html += '<div class="claim-item"><div class="claim-header"><span style="font-weight:500">' + (c.claimer ? c.claimer.nickname || '用户' : '用户') + '</span> <span class="status-badge status-' + c.status + '">' + claimStatusText(c.status) + '</span></div>';
        html += '<div class="claim-reason">' + c.claimReason + '</div>';
        if (c.status === 'pending') html += '<div class="claim-actions"><button class="btn btn-sm btn-primary" onclick="confirmClaim(\'' + c.id + '\')">确认</button><button class="btn btn-sm btn-danger" onclick="rejectClaim(\'' + c.id + '\')">拒绝</button></div>';
        if (c.status === 'confirmed') html += '<div class="claim-actions"><button class="btn btn-sm btn-primary" onclick="confirmReturn(\'' + c.id + '\')">确认归还</button></div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '<div class="modal-actions"><button class="btn btn-outline" onclick="hideModal()">关闭</button>';
    if (canClaim) html += '<button class="btn btn-primary" onclick="submitClaim(\'' + item.id + '\')">我要认领</button>';
    html += '</div>';
    showModal(html);
  } catch (e) { alert('加载失败: ' + e.message); }
}

async function submitClaim(itemId) {
  if (!requireAuth()) return;
  var reason = document.getElementById('claim-reason') ? document.getElementById('claim-reason').value.trim() : '';
  if (!reason) { alert('请填写认领说明'); return; }
  try {
    await api('/claims', { method: 'POST', body: JSON.stringify({ itemId: itemId, claimReason: reason }) });
    alert('认领申请已提交！'); hideModal();
  } catch (e) { alert('提交失败: ' + e.message); }
}

async function confirmClaim(claimId) { try { await api('/claims/' + claimId + '/confirm', { method: 'PUT' }); alert('已确认认领'); hideModal(); } catch (e) { alert(e.message); } }
async function rejectClaim(claimId) { try { await api('/claims/' + claimId + '/reject', { method: 'PUT' }); alert('已拒绝认领'); hideModal(); } catch (e) { alert(e.message); } }
async function confirmReturn(claimId) { if (!confirm('确认物品已归还给失主？')) return; try { await api('/claims/' + claimId + '/return', { method: 'PUT' }); alert('归还确认完成'); hideModal(); } catch (e) { alert(e.message); } }

async function renderMine() {
  if (!requireAuth()) return;
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="card" style="display:flex;align-items:center;gap:16px">' +
    '<div style="width:48px;height:48px;border-radius:50%;background:#E8F5E9;display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>' +
    '<div><div style="font-weight:600">' + (currentUser ? currentUser.nickname || '用户' : '用户') + '</div>' +
    '<div style="font-size:13px;color:#999">' + (currentUser ? currentUser.email || '' : '') + '</div></div></div>' +
    '<div class="tabs">' +
    '<div class="tab active" data-tab="my-items" onclick="switchMineTab(this,\'my-items\')">我的上报</div>' +
    '<div class="tab" data-tab="my-claims" onclick="switchMineTab(this,\'my-claims\')">我的认领</div>' +
    '<div class="tab" data-tab="notifications" onclick="switchMineTab(this,\'notifications\')">通知</div>' +
    '</div><div id="mine-content"></div>';
  loadMyItems();
}

async function switchMineTab(el, tab) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  if (tab === 'my-items') await loadMyItems();
  else if (tab === 'my-claims') await loadMyClaims();
  else if (tab === 'notifications') await loadNotifications();
}

async function loadMyItems() {
  try {
    var data = await api('/items/mine?pageSize=50');
    var container = document.getElementById('mine-content');
    if (!data.list || data.list.length === 0) { container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><div>暂无上报记录</div></div>'; return; }
    container.innerHTML = data.list.map(function(item) {
      return '<div class="card" style="cursor:pointer" onclick="showDetail(\'' + item.id + '\')">' +
        '<div style="display:flex;justify-content:space-between;align-items:center"><span class="tag">' + item.category + '</span><span class="status-badge status-' + item.status + '">' + statusText(item.status) + '</span></div>' +
        '<div style="margin-top:8px;font-size:14px;color:#666">📍 ' + item.location + '</div>' +
        '<div style="font-size:13px;color:#999">' + formatTime(item.foundTime) + '</div></div>';
    }).join('');
  } catch (e) { console.error(e); }
}

async function loadMyClaims() {
  try {
    var data = await api('/claims?type=my_claims&pageSize=50');
    var container = document.getElementById('mine-content');
    if (!data.list || data.list.length === 0) { container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><div>暂无认领记录</div></div>'; return; }
    container.innerHTML = data.list.map(function(c) {
      return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag">' + (c.item ? c.item.category || '未知' : '未知') + '</span><span class="status-badge status-' + c.status + '">' + claimStatusText(c.status) + '</span></div>' +
        '<div style="margin-top:8px;font-size:14px;color:#666">' + c.claimReason + '</div></div>';
    }).join('');
  } catch (e) { console.error(e); }
}

async function loadNotifications() {
  try {
    var data = await api('/notifications?pageSize=50');
    var container = document.getElementById('mine-content');
    if (!data.list || data.list.length === 0) { container.innerHTML = '<div class="empty-state"><div class="icon">🔔</div><div>暂无通知</div></div>'; return; }
    container.innerHTML = data.list.map(function(n) {
      return '<div class="card"><div style="font-weight:500">' + n.title + '</div><div style="font-size:13px;color:#999;margin-top:4px">' + formatTime(n.createdAt) + '</div></div>';
    }).join('');
  } catch (e) { console.error(e); }
}

function statusText(s) { return { pending: '待认领', claiming: '认领中', returned: '已归还', expired: '已过期' }[s] || s; }
function claimStatusText(s) { return { pending: '待确认', confirmed: '已确认', returning: '归还中', completed: '已完成', rejected: '已拒绝', expired: '已超时' }[s] || s; }
function formatTime(t) { if (!t) return ''; return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }

__ConfigLoader.init().then(function(config) {
  API_BASE = config.API_BASE || '';
  window.API_BASE = API_BASE;
  console.log('[App] 启动, API_BASE=' + (API_BASE || '(未配置)'));
  loadProfile().then(function() { navigate('home'); }).catch(function() { navigate('home'); });
}).catch(function(err) {
  console.warn('[App] 配置加载失败:', err);
  API_BASE = getApiBase();
  navigate('home');
});
