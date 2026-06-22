export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/config.js') {
      const config = {
        API_BASE: env.API_BASE || '/api/v1',
        APP_NAME: env.APP_NAME || '校园失物招领',
        RECOGNITION_PROVIDER: env.RECOGNITION_PROVIDER || 'tensorflow',
        NOTIFICATION_PROVIDER: env.NOTIFICATION_PROVIDER || 'email'
      };

      return new Response(
        `window.__APP_CONFIG__=${JSON.stringify(config)};`,
        {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=300'
          }
        }
      );
    }

    const response = await env.ASSETS.fetch(request);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (response.headers.get('Content-Type')?.includes('text/html')) {
        const config = {
          API_BASE: env.API_BASE || '/api/v1',
          APP_NAME: env.APP_NAME || '校园失物招领'
        };

        const configScript = `window.__APP_CONFIG__=${JSON.stringify(config)};`;

        return new HTMLRewriter()
          .on('head', {
            element(element) {
              element.append(
                `<script>${configScript}</script>`,
                { html: true }
              );
            }
          })
          .transform(response);
      }
    }

    return response;
  }
};