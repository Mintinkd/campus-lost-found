const express = require('express');

function configRouter() {
  const router = express.Router();

  router.get('/api/v1/config/client', (req, res) => {
    const clientConfig = {
      API_BASE: process.env.API_BASE || '/api/v1',
      APP_NAME: process.env.APP_NAME || '校园失物招领',
      RECOGNITION_PROVIDER: process.env.RECOGNITION_PROVIDER || 'tensorflow',
      NOTIFICATION_PROVIDER: process.env.NOTIFICATION_PROVIDER || 'email',
      MAX_UPLOAD_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
      AUTH_PROVIDER: process.env.AUTH_PROVIDER || 'local'
    };

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ code: 0, message: 'ok', data: clientConfig });
  });

  return router;
}

module.exports = configRouter;