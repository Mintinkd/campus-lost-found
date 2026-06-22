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
    return new URL('/api/v1', window.location.origin).href;
  }

  function init() {
    var config = mergeConfig();
    var apiBase = config.API_BASE || detectApiBase();
    config.API_BASE = apiBase;
    window.__APP_CONFIG__ = Object.freeze(config);
    return Promise.resolve(config);
  }

  window.__ConfigLoader = {
    init: init,
    getConfig: function () { return window.__APP_CONFIG__ || DEFAULTS; },
    get: function (key) { return (window.__APP_CONFIG__ || DEFAULTS)[key]; }
  };
})();
