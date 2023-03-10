import { askChad, fetchLocalTunnel } from './api';
import { Env, RequestJson } from './types';

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext
  ): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(null, { status: 404 });
    }

    if (await env.CHAD.get('LOCAL_BYPASS_ENABLED')) {
      return fetchLocalTunnel(request, env);
    }

    const {
      api_app_id,
      token,
      event: { channel, text, user },
    } = await request.json<RequestJson>();

    if (
      api_app_id !== env.SLACK_APP_ID ||
      token !== env.SLACK_VERIFICATION_TOKEN
    ) {
      return new Response(null, { status: 401 });
    }

    context.waitUntil(askChad({ prompt: text, user, channel }, env));

    return new Response(null, { status: 200 });
  },
};
