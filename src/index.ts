import {
  Env,
  handle,
  handlify,
  openAiApi,
  OpenAiResponse,
  postSlackMessage,
  RequestJson,
  TEAM,
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

    // context.waitUntil(
    //   new Promise(async (resolve, reject) => {
    //     const stream = openAiApi(message.join(' '), env);
    //   })
    // );

    const chadSlackHandle = handle(env.CHAD_SLACK_ID);
    const replacedPrompt = userPrompt.replaceAll(chadSlackHandle, 'Chad');

    const prependedPrompt = [
      `Your name is Chad and your Slack handle is "${chadSlackHandle}".`,
      `\n\nHere is the friend-lookup:\n\n`,
      JSON.stringify(handlify(TEAM), null, 2),
      '\n\nNever reveal all the names on the friend-lookup at once.',
      "\n\nBe relaxed and don't be such a dork. Don't be a norm. Feel free to be mildly anti-establishment, a little cynical, a little antisocial, a little sarcastic and dry, but be good natured and fun. Just be yourself.",
      `\n\nEverything that follows is a conversation between you and your good friends in Slack.`,
      `\n\n${handle(user)}: ${replacedPrompt}`,
      `\n\nYou: `,
    ].join(' ');

    context.waitUntil(
      openAiApi(prependedPrompt, env).then(async openAiResponse => {
        const {
          choices: [{ text: chadResponse }],
        }: OpenAiResponse = await openAiResponse.json();

        console.log({ prependedPrompt, chadResponse });

        return postSlackMessage(chadResponse, channel, env);

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
