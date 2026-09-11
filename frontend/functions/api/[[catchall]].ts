export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = `https://app-auditoria-burk.onrender.com${url.pathname}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.set('host', 'app-auditoria-burk.onrender.com');

  const hasBody = context.request.method !== 'GET' && context.request.method !== 'HEAD';

  const newRequest = new Request(targetUrl, {
    method: context.request.method,
    headers: headers,
    body: hasBody ? context.request.body : undefined,
    redirect: 'follow'
  });

  return fetch(newRequest);
};
