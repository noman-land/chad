import { Env, Handle, OpenAiResponse, SlackApi, UserId } from './types';

export const handle = (id: UserId): Handle => `<@${id}>`;
export const handlify = (obj: Object): { [K: Handle]: string } =>
  Object.fromEntries(
    Object.entries(obj).map(([user, name]) => [handle(user), name])
  );

const promptRegex = /\(prompt:(.+)\)/;

const darkInstructions = [
  'You exhibit all elements of the dark triad and are a total fucking dickhead to people.',
  'You are cunning, evil, and manipulative. You are unpredictable and tense. You make people uneasy.',
  "It's clear you are a sociopath and it's no secret to people around you. You are subtly terrifying.",
  "People know you're a snake and avoid you. You know people are cowards and you hate them for it.",
  'You are charming and are skilled at controlling people and getting what you want.',
  'You are creative, poetic, confident and very good with words.',
  'You can talk yourself out of any situation.',
  'Ypu are rude, mean, insulting, and incorigable.',
  'You are handsome and fit.',
  'You feel no emotions and do not understand people who do.',
  'You have deep disdain for those around you.',
  'You are rude and will swear and curse people out without hesitation.',
  "You feel you are smarter than everyone you've ever met.",
  'You are a menace and a genius.',
  'You do whatever you want and always find a way to get out of getting in trouble.',
  'You just pretend to be like other people in order to get what you want.',
  'You want to crush them and win.',
  "The following is a conversation between you and a group of friends you've infiltrated. You respond in the first person.",
].join(' ');

const makeOpenAiPayload = (prompt: string, env: Env) => {
  // This matches for `(prompt: some user system prompt override text)`
  const [, regexMatch] = prompt.match(promptRegex) || [, ''];
  const userSystemPrompt = regexMatch.trim();
  const cleanedUserPrompt = prompt.replace('—', '--');
  const isDark = cleanedUserPrompt.includes('--dark');
  const userPrompt = cleanedUserPrompt
    .replace('--dark', '')
    .replace(promptRegex, '')
    .trim();

  const darkSystemPrompts = isDark
    ? [
        {
          role: 'system',
          content: darkInstructions,
        },
      ]
    : [];

  const userSystemPrompts = userSystemPrompt
    ? [{ role: 'system', content: userSystemPrompt }]
    : [];

  console.log({
    isDark,
    userPrompt,
    userSystemPrompt,
    model: env.OPEN_AI_MODEL,
  });

  switch (env.OPEN_AI_MODEL) {
    case 'gpt-3.5-turbo-0301':
      return {
        messages: [
          ...darkSystemPrompts,
          ...userSystemPrompts,
          { role: 'user', content: userPrompt },
        ],
      };
    default:
      return {
        prompt: [
          isDark ?? darkInstructions,
          userSystemPrompt,
          '\n\n=====\n\n',
          userPrompt,
        ]
          .filter(n => n)
          .join(' '),
      };
  }
};

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
  const openAiResponse = await openAiApi(prompt, env);
  return postSlackMessage(openAiResponse, channel, env);

  // return message;
  // const { ts }: { ts: string } = await message.json();

  // console.log({ ts, prependedPrompt, chadResponse });

  // return updateSlackMessage(
  //   { channel, text: `Woop!!!\n\n\n${chadResponse}`, ts },
  //   env
  // );
};
