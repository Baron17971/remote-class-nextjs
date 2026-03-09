import { createVertexAIClient } from '../../lib/vertexAiClient';

export const runtime = 'nodejs';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

type ChatRequestBody = {
  prompt?: unknown;
  model?: unknown;
  config?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const ai = createVertexAIClient();

    const model = typeof body.model === 'string' && body.model.trim() ? body.model : DEFAULT_MODEL;
    const config =
      body.config && typeof body.config === 'object' && !Array.isArray(body.config)
        ? (body.config as Record<string, unknown>)
        : undefined;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      ...(config ? { config } : {}),
    });

    return Response.json({ text: response.text ?? '' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while calling Vertex AI';
    console.error('[api/chat] Vertex AI error:', error instanceof Error ? error.message : error);
    return Response.json({ error: message }, { status: 500 });
  }
}
