interface SlackAppMentionEvent {
  client_msg_id: string;
  type: 'app_mention';
  text: string;
  user: string;
  ts: string;
  team: string;
  channel: string;
  event_ts: string;
}

interface CompletionChoiceV1 {
  text: string;
}

interface CompletionChoiceV2 {
  message: { content: string };
}

type OpenAiModel = 'gpt-3.5-turbo-0301' | 'text-davinci-003';

interface OpenAiResponseBase<Choice> {
  model: OpenAiModel;
  choices: Choice[];
}

interface OpenAiResponseV1 extends OpenAiResponseBase<CompletionChoiceV1> {
  model: 'text-davinci-003';
}

interface OpenAiResponseV2 extends OpenAiResponseBase<CompletionChoiceV2> {
  model: 'gpt-3.5-turbo-0301';
}

interface Body {
  body: string;
  contentType?: string;
  method?: string;
}

export interface Env {
  SLACK_APP_ID: string;
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_VERIFICATION_TOKEN: string;
  OPEN_AI_API_KEY: string;
  CHAD: KVNamespace;
  CHAD_SLACK_ID: string;
  TUNNEL_URL: string;
  OPEN_AI_MODEL: OpenAiModel;
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

export type OpenAiResponse = OpenAiResponseV1 | OpenAiResponseV2;

export type UserId = string;

export type Handle = `<@${UserId}>`;

export type SlackApi = (url: string, body: Body, env: Env) => Promise<Response>;
