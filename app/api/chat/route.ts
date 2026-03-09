import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';

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

    const project = process.env.GOOGLE_CLOUD_PROJECT;
    if (!project) {
      return Response.json({ error: 'Missing GOOGLE_CLOUD_PROJECT' }, { status: 500 });
    }

    const ai = new GoogleGenAI({
      vertexai: true,
      project,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
    });

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
    return Response.json({ error: message }, { status: 500 });
  }
}
