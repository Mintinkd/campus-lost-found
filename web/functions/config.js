export async function onRequestGet(context) {
  const { env } = context;

  const config = {
    API_BASE: env.API_BASE || 'https://campus-lost-found-3ywr.onrender.com/api/v1',
    APP_NAME: env.APP_NAME || '校园失物招领',
    RECOGNITION_PROVIDER: env.RECOGNITION_PROVIDER || 'tensorflow',
    NOTIFICATION_PROVIDER: env.NOTIFICATION_PROVIDER || 'email',
    MAX_UPLOAD_SIZE: env.MAX_UPLOAD_SIZE || '10485760'
  };

  const js = `window.__APP_CONFIG__ = ${JSON.stringify(config)};`;

  return new Response(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}