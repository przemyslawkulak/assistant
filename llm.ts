import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const callLlm = async (
  message: string,
  config: { model?: string; temperature?: number; response_format?: Object },
  systemMessage: string = 'You are a helpful assistant.'
): Promise<any> => {
  const modelSettings: { model: string; temperature: number; response_format?: Object } = {
    model: config.model ?? 'gpt-4o',
    temperature: config.temperature ?? 0.7,
  };
  if (config.response_format) {
    modelSettings.response_format = config.response_format;
  }
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: message },
    ],
    ...modelSettings,
  });
  return completion.choices[0].message.content;
};
