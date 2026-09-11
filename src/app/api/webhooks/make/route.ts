import { NextResponse } from 'next/server';
import { MakeOrchestrationGateway, UnauthorizedCallbackError } from '@/server/services/make/gateway.service';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('X-Make-Signature') ?? req.headers.get('X-STARS-Signature') ?? '';

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature HMAC manquante dans les en-têtes (X-Make-Signature).' },
        { status: 401 },
      );
    }

    const result = await MakeOrchestrationGateway.handleCallback(rawBody, signature);

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      status: result.status,
    });
  } catch (err) {
    if (err instanceof UnauthorizedCallbackError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    const message = err instanceof Error ? err.message : 'Erreur interne lors du traitement du callback Make';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
