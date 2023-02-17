import {
  Env,
  openAiApi,
  OpenAiResponse,
  RequestJson,
  slackPost,
} from './utils';

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext
  ): Promise<Response> {
    if (await env.CHAD.get('LOCAL_BYPASS_ENABLED')) {
      return fetch('https://chad-local.noman.land', {
        headers: request.headers,
        body: request.body,
        method: request.method,
      });
    }

    if (request.method !== 'POST') {
      return new Response(null, { status: 404 });
    }

    const {
      api_app_id,
      token,
      event: { channel, text },
    }: RequestJson = await request.json();

    if (
      api_app_id !== env.SLACK_APP_ID ||
      token !== env.SLACK_VERIFICATION_TOKEN
    ) {
      return new Response(null, { status: 401 });
    }

    // Text includes @chad at the beginning so removing it
    const [, ...message] = text.split(' ');

    context.waitUntil(
      new Promise(async (resolve, reject) => {
        const stream = openAiApi(message.join(' '), env);
      })
    );
    context.waitUntil(
      openAiApi(message.join(' '), env).then(async openAiResponse => {
        const {
          choices: [{ text }],
        }: OpenAiResponse = await openAiResponse.json();

        const resp = await slackPost(
          'chat.postMessage',
          {
            text,
            channel,
            link_names: true,
            unfurl_links: true,
            unfurl_media: true,
          },
          env
        );

        return resp;

        // const { ts } = await resp.json();
        // // console.log('\n\n\n\nAFTER SLACK POST\n\n\n\n', obj, '\n\n\n\n');
        // slackPost(
        //   'chat.update',
        //   {
        //     text,
        //     channel,
        //     ts,
        //   },
        //   env
        // );
      })
    );

    return new Response(null, { status: 200 });
  },
};
