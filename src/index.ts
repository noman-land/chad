import { Env, openAiApi, RequestJson, slackPost } from './utils';

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
        const openAiResponse = await openAiApi(message.join(' '), env);

        const {
          choices: [choice],
        } = await openAiResponse.json();

        console.log(choice);

        await slackPost(
          'chat.postMessage',
          {
            text: choice.text,
            channel,
            link_names: false,
            unfurl_links: false,
          },
          env
        );
      }
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 401 });
  },
};
