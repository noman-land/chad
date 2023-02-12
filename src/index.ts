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
    if (request.method === 'POST') {
      const {
        api_app_id,
        token,
        event: { channel, text },
      }: RequestJson = await request.json();

      if (
        api_app_id === env.SLACK_APP_ID &&
        token === env.SLACK_VERIFICATION_TOKEN
      ) {
        const [, ...message] = text.split(' ');

        context.waitUntil(
          openAiApi(message.join(' '), env).then(async openAiResponse => {
            const {
              choices: [{ text }],
            }: OpenAiResponse = await openAiResponse.json();

            return slackPost(
              'chat.postMessage',
              {
                text,
                channel,
                link_names: false,
                unfurl_links: true,
                unfurl_media: true,
              },
              env
            );
          })
        );

        return new Response(null, { status: 200 });
      }
    }
    return new Response(null, { status: 401 });
  },
};
