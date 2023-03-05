import { makeOpenAiPayload } from './utils';
import { Env, OpenAiResponse, SlackApi, UserId } from './types';

const slackApi: SlackApi = async (
  url,
  { body, contentType = 'application/json; charset=utf-8', method = 'GET' },
  env
) =>
  fetch(`https://slack.com/api/${url}`, {
    body,
    headers: {
      authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
      'content-type': contentType,
    },
    method,
  });

const openAiApi = async (prompt: string, env: Env) => {
  const openAiResponse = await fetch(
    env.OPEN_AI_MODEL === 'gpt-3.5-turbo-0301'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.openai.com/v1/completions',
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPEN_AI_API_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify({
        model: env.OPEN_AI_MODEL || 'text-davinci-003',
        max_tokens: 300,
        // stream: true, // TODO
        ...makeOpenAiPayload(prompt, env),
      }),
    }
  );

  const { model, choices } = await openAiResponse.json<OpenAiResponse>();
  return model === 'gpt-3.5-turbo-0301'
    ? choices[0].message.content
    : choices[0].text;
};

const slackPost = async (url: string, body: Object, env: Env) =>
  slackApi(
    url,
    {
      body: JSON.stringify(body),
      method: 'POST',
    },
    env
  );

const postSlackMessage = async (message: string, channel: string, env: Env) =>
  slackPost(
    'chat.postMessage',
    {
      text: message,
      channel,
      link_names: true,
      unfurl_links: true,
      unfurl_media: true,
    },
    env
  );

const updateSlackMessage = async (
  { channel, text, ts }: { channel: string; text: string; ts: string },
  env: Env
) =>
  slackPost(
    'chat.update',
    {
      channel,
      text,
      ts,
    },
    env
  );

export const askChad = async (
  { prompt, user, channel }: { prompt: string; user: UserId; channel: string },
  env: Env
) => {
  const openAiResponse = await openAiApi(prompt, env);
  return postSlackMessage(openAiResponse, channel, env);

  // return message;
  // const { ts } = await message.json<{ ts: string }>();

  // console.log({ ts, prependedPrompt, chadResponse });

  // return updateSlackMessage(
  //   { channel, text: `Woop!!!\n\n\n${chadResponse}`, ts },
  //   env
  // );
};

export const fetchLocalTunnel = async (request: Request, env: Env) => {
  console.log('* * * * * * * * * * * * * * * * * * *');
  console.log('* * * BYPASSING TO LOCAL TUNNEL * * *');
  console.log('* * * * * * * * * * * * * * * * * * *');
  return fetch(`https://${env.TUNNEL_URL}`, {
    headers: request.headers,
    body: request.body,
    method: request.method,
  });
};
