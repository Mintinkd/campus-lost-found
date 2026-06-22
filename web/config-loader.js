/**
 * 配置加载器 - 支持多种环境变量注入方案
 *
 * 方案A: Cloudflare Pages Functions 动态生成 /config.js
 * 方案B: 构建时 sed 替换占位符，生成静态 config.js
 * 方案C: 运行时从后端 /api/v1/config/client 获取
 * 方案D: Cloudflare Workers HTMLRewriter 注入 window.__APP_CONFIG__
 *
 * 优先级: __APP_CONFIG__ > config.js > 后端API > data-* 属性 > 默认值
 */

(function () {
  'use strict';

  var DEFAULTS = {
    API_BASE: '/api/v1',
    APP_NAME: '校园失物招领',
    RECOGNITION_PROVIDER: 'tensorflow',
    NOTIFICATION_PROVIDER: 'email',
    MAX_UPLOAD_SIZE: '10485760',
    AUTH_PROVIDER: 'local'
  };

  var ALLOWED_KEYS = Object.keys(DEFAULTS);

  var SENSITIVE_PATTERNS = [
    /password/i, /secret/i, /key/i, /token/i,
    /private/i, /credential/i, /auth.*header/i
  ];

  function isSensitiveKey(key) {
    return SENSITIVE_PATTERNS.some(function (pattern) {
      return pattern.test(key);
  });
  }

  function sanitizeConfig(raw) {
    if (!raw || typeof raw !== 'object') return {};

    var safe = {};
    for (var key in raw) {
      if (!raw.hasOwnProperty(key)) continue;
      if (ALLOWED_KEYS.indexOf(key) === -1) continue;
      if (isSensitiveKey(key)) {
        console.warn('[ConfigLoader] 拒绝注入敏感配置项: ' + key);
        continue;
      }
      if (typeof raw[key] === 'string') {
        safe[key] = raw[key].replace(/[<>"'&]/g, '');
      } else {
        safe[key] = raw[key];
      }
    }
    return safe;
  }

  function mergeConfig() {
    var config = {};

    for (var key in DEFAULTS) {
      if (!DEFAULTS.hasOwnProperty(key)) continue;
      config[key] = DEFAULTS[key];
    }

    if (window.__APP_CONFIG__) {
      var sanitized = sanitizeConfig(window.__APP_CONFIG__);
      for (var k in sanitized) {
        if (sanitized.hasOwnProperty(k)) config[k] = sanitized[k];
      }
    }

    var scriptEl = document.querySelector('script[data-api-base]');
    if (scriptEl && scriptEl.dataset.apiBase) {
      config.API_BASE = scriptEl.dataset.apiBase;
    }

    window.__APP_CONFIG__ = Object.freeze(config);
    return config;
  }

  function loadFromBackend() {
    var apiBase = window.__APP_CONFIG__
      ? window.__APP_CONFIG__.API_BASE
      : DEFAULTS.API_BASE;

    if (!apiBase || apiBase === '/api/v1') {
      return Promise.resolve(window.__APP_CONFIG__);
    }

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 3000);

    return fetch(apiBase + '/config/client', { signal: controller.signal })
      .then(function (res) {
        clearTimeout(timeout);
        if (!res.ok) {
          console.warn('[ConfigLoader] 后端配置接口返回 ' + res.status);
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (data && data.code === 0 && data.data) {
          var sanitized = sanitizeConfig(data.data);
          for (var k in sanitized) {
            if (sanitized.hasOwnProperty(k) && !window.__APP_CONFIG__[k]) {
              var merged = Object.assign({}, window.__APP_CONFIG__, sanitized);
              window.__APP_CONFIG__ = Object.freeze(merged);
              break;
            }
          }
        }
        return window.__APP_CONFIG__;
      })
      .catch(function (err) {
        clearTimeout(timeout);
        console.warn('[ConfigLoader] 后端配置加载失败:', err.message);
        return window.__APP_CONFIG__;
      });
  }

  function init() {
    var config = mergeConfig();

    if (!config.API_BASE || config.API_BASE === DEFAULTS.API_BASE) {
      return loadFromBackend();
    }

    return Promise.resolve(config);
  }

  window.__ConfigLoader = {
    init: init,
    getConfig: function () { return window.__APP_CONFIG__ || DEFAULTS; },
    get: function (key) { return (window.__APP_CONFIG__ || DEFAULTS)[key]; }
  };
})();