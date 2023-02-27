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
    if (request.method !== 'POST') {
      return new Response(null, { status: 404 });
    }

    const {
      api_app_id,
      token,
      event: { channel, text: userPrompt },
    }: RequestJson = await request.json();

    if (
      api_app_id !== env.SLACK_APP_ID ||
      token !== env.SLACK_VERIFICATION_TOKEN
    ) {
      return new Response(null, { status: 401 });
    }

    if (await env.CHAD.get('LOCAL_BYPASS_ENABLED')) {
      return fetch('https://chad-local.noman.land', {
        headers: request.headers,
        body: request.body,
        method: request.method,
      }).catch(e => {
        console.log(e);
        throw new Error(e);
      });
    }

    // context.waitUntil(
    //   new Promise(async (resolve, reject) => {
    //     const stream = openAiApi(message.join(' '), env);
    //   })
    // );

    const replacedPrompt = userPrompt.replaceAll(
      `<@${env.CHAD_SLACK_ID}>`,
      'Chad'
    );

    const prependedPrompt = `Your name is Chad and your Slack handle is "<@${env.CHAD_SLACK_ID}>". Everything that follows is a conversation between you and your friends in Slack.\n\nfriend: ${replacedPrompt}\n\nyou: `;

    context.waitUntil(
      openAiApi(prependedPrompt, env)
        .then(async openAiResponse => {
          const {
            choices: [{ text: chadResponse }],
          }: OpenAiResponse = await openAiResponse.json();

          console.log({ prependedPrompt, chadResponse });

          const resp = await slackPost(
            'chat.postMessage',
            {
              text: chadResponse,
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
        .catch(e => {
          console.error(e);
          throw new Error(e);
        })
    );

    return new Response(null, { status: 200 });
  },
};
