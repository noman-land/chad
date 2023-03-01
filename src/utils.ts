export interface Env {
  SLACK_APP_ID: string;
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_VERIFICATION_TOKEN: string;
  OPEN_AI_API_KEY: string;
  CHAD: KVNamespace;
  CHAD_SLACK_ID: string;
  TUNNEL_URL: string;
  OPEN_AI_MODEL: string;
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

export interface RequestJson {
  api_app_id: string;
  token: string;
  event: SlackAppMentionEvent;
}

export interface SlackAppMentionEvent {
  client_msg_id: string;
  type: 'app_mention';
  text: string;
  user: string;
  ts: string;
  team: string;
  channel: string;
  event_ts: string;
}

interface CompletionChoice {
  text: string;
}

export interface OpenAiResponse {
  choices: CompletionChoice[];
}

interface Body {
  body: string;
  contentType?: string;
  method?: string;
}

type UserId = string;

type Handle = `<@${UserId}>`;

export const handle = (id: UserId): Handle => `<@${id}>`;
export const handlify = (obj: Object): { [K: Handle]: string } =>
  Object.fromEntries(
    Object.entries(obj).map(([user, name]) => [handle(user), name])
  );

type SlackApi = (url: string, body: Body, env: Env) => Promise<Response>;

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

export const openAiApi = async (prompt: string, env: Env) => {
  const model = env.OPEN_AI_MODEL || 'text-davinci-003';
  console.log(model);
  return fetch('https://api.openai.com/v1/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPEN_AI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      prompt,
      max_tokens: 300,
      // stream: true, // TODO
    }),
  });
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

export const postSlackMessage = async (
  message: string,
  channel: string,
  env: Env
) =>
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

export const updateSlackMessage = async (
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
  const chadSlackHandle = handle(env.CHAD_SLACK_ID);
  const replacedPrompt = prompt.replaceAll(chadSlackHandle, 'Chad');
  const openAiResponse = await openAiApi(replacedPrompt, env);

  const {
    choices: [{ text }],
  }: OpenAiResponse = await openAiResponse.json();

  return postSlackMessage(text, channel, env);

  // return message;
  // const { ts }: { ts: string } = await message.json();

  // console.log({ ts, prependedPrompt, chadResponse });

  // return updateSlackMessage(
  //   { channel, text: `Woop!!!\n\n\n${chadResponse}`, ts },
  //   env
  // );
};
