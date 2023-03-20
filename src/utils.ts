import { Env, Handle, UserId } from './types';

export const handle = (id: UserId): Handle => `<@${id}>`;
export const handlify = (obj: Object): { [K: Handle]: string } =>
  Object.fromEntries(
    Object.entries(obj).map(([user, name]) => [handle(user), name])
  );

const userSystemPromptRegex = /\((.+)\)/;

const chatInstructions =
  'Your Slack handle is <@U04NVJG929J> and your name is Chad.';

export const makeOpenAiPayload = (prompt: string, env: Env) => {
  const [, regexMatch] = prompt.match(userSystemPromptRegex) ?? [, ''];
  const userSystemPrompt = regexMatch.trim();
  const userPrompt = prompt.replace(userSystemPromptRegex, '').trim();

  const userSystemPrompts = userSystemPrompt
    ? [{ role: 'system', content: userSystemPrompt }]
    : [];

  console.log({
    userPrompt,
    userSystemPrompt,
    model: env.OPEN_AI_MODEL,
  });

  switch (env.OPEN_AI_MODEL) {
    case 'gpt-3.5-turbo-0301':
      return {
        messages: [
          {
            role: 'system',
            content: chatInstructions,
          },
          {
            role: 'assistant',
            content:
              'I understand. My name is Chad and my Slack handle is <@U04NVJG929J>.',
          },
          ...userSystemPrompts,
          { role: 'user', content: userPrompt },
        ],
      };
    default:
      return {
        prompt: [
          chatInstructions,
          userSystemPrompt,
          '\n\n=====\n\n',
          userPrompt,
        ]
          .filter(n => n)
          .join(' '),
      };
  }
};

async function* chunksToLines(chunksAsync: ReadableStream) {
  let previous = '';
  for await (const chunk of chunksAsync) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    previous += bufferChunk;
    let eolIndex;
    while ((eolIndex = previous.indexOf('\n')) >= 0) {
      const line = previous.slice(0, eolIndex + 1).trimEnd();
      if (line === 'data: [DONE]') {
        console.log('\n\n* * * End of response stream * * *\n\n');
        break;
      }
      if (line.startsWith('data: ')) {
        yield line;
      }
      previous = previous.slice(eolIndex + 1);
    }
  }
}

async function* linesToMessages(linesAsync: AsyncGenerator<string>) {
  for await (const line of linesAsync) {
    yield line.substring('data: '.length);
  }
}

export async function* streamCompletion(data: ReadableStream) {
  yield* linesToMessages(chunksToLines(data));
}
