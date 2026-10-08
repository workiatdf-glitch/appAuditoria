import { handleApiRequest } from './api-handler';

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      const apiResponse = await handleApiRequest(request, env);
      if (apiResponse) {
        return apiResponse;
      }
    }

    // If request is not /api or not handled, serve static assets
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
