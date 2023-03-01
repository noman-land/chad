import {
  askChad,
  Env,
  handle,
  handlify,
  openAiApi,
  OpenAiResponse,
  postSlackMessage,
  RequestJson,
  TEAM,
  updateSlackMessage,
} from './utils';

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
      console.log('* * * * * * * * * * * * * * * * * * *');
      console.log('* * * BYPASSING TO LOCAL TUNNEL * * *');
      console.log('* * * * * * * * * * * * * * * * * * *');
      return fetch(`https://${env.TUNNEL_URL}`, {
        headers: request.headers,
        body: request.body,
        method: request.method,
      });
    }

    const {
      api_app_id,
      token,
      event: { channel, text: userPrompt, user },
    }: RequestJson = await request.json();

    if (
      api_app_id !== env.SLACK_APP_ID ||
      token !== env.SLACK_VERIFICATION_TOKEN
    ) {
      return new Response(null, { status: 401 });
    }

    context.waitUntil(askChad({ prompt: userPrompt, user, channel }, env));

    return new Response(null, { status: 200 });
  },
};
