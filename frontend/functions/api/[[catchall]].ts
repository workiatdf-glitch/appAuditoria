import { handleApiRequest } from '../../src/api-handler';

export const onRequest: PagesFunction<any> = async (context) => {
  const response = await handleApiRequest(context.request, context.env);
  if (response) {
    return response;
  }
  return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
};
