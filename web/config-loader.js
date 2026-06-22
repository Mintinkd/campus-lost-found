(function () {
  'use strict';

  var DEFAULTS = {
    API_BASE: '',
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
      if (isSensitiveKey(key)) continue;
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

    window.__APP_CONFIG__ = Object.freeze(config);
    return config;
  }

  function detectApiBase() {
    if (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) {
      return window.__APP_CONFIG__.API_BASE;
    }
    var meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) return meta.content;
    var base = document.querySelector('base');
    if (base && base.href) return new URL('/api/v1', base.href).href;
    return '';
  }

  function probeBackend(apiBase) {
    if (!apiBase) return Promise.resolve(null);
    var url = apiBase.replace(/\/+$/, '') + '/health';
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 5000);

    return fetch(url, { signal: controller.signal, mode: 'cors' })
      .then(function (res) {
        clearTimeout(timeout);
        if (res.ok) return res.json();
        return null;
      })
      .then(function (data) {
        if (data && data.code === 0) return apiBase;
        return null;
      })
      .catch(function () {
        clearTimeout(timeout);
        return null;
      });
  }

  function init() {
    var config = mergeConfig();
    var apiBase = config.API_BASE || detectApiBase();

    if (apiBase) {
      return probeBackend(apiBase).then(function (validBase) {
        if (validBase) {
          config.API_BASE = validBase;
          window.__APP_CONFIG__ = Object.freeze(config);
          return config;
        }
        console.warn('[Config] 后端不可达: ' + apiBase);
        config.API_BASE = '';
        config._backendUnreachable = true;
        window.__APP_CONFIG__ = Object.freeze(config);
        return config;
      });
    }

    return Promise.resolve(config);
  }

  window.__ConfigLoader = {
    init: init,
    getConfig: function () { return window.__APP_CONFIG__ || DEFAULTS; },
    get: function (key) { return (window.__APP_CONFIG__ || DEFAULTS)[key]; }
  };
})();
