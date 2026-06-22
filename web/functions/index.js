export async function onRequestGet(context) {
  const { env, request } = context;

  const config = {
    API_BASE: env.API_BASE || 'https://campus-lost-found-3ywr.onrender.com/api/v1',
    APP_NAME: env.APP_NAME || '校园失物招领'
  };

  const originalUrl = new URL(request.url);
  const htmlPath = new URL('/index.html', originalUrl.origin);

  const htmlResponse = await fetch(htmlPath);
  const html = await htmlResponse.text();

  const injectedScript = `<script>window.__APP_CONFIG__=${JSON.stringify(config)};</script>`;
  const modifiedHtml = html.replace('</head>', `${injectedScript}</head>`);

  return new Response(modifiedHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  });
}