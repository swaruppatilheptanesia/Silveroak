import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * SOU → PlaceReady event webhook (SR 36). When an event is published or students are newly assigned, the
 * PlaceReady student app is told so it can notify those students (in-app + push). PlaceReady matches students
 * by SOU id or enrollment number, so both are sent.
 *
 * Fire-and-forget and best-effort: never throws, 5 s timeout, and a no-op when PLACEREADY_WEBHOOK_URL /
 * PLACEREADY_WEBHOOK_SECRET aren't configured — an unreachable PlaceReady must never affect SOU.
 */
export function sendPlaceReadyEventWebhook(kind: 'published' | 'assigned', eventId: string, studentIds: string[]): void {
  if (!env.placereadyWebhookUrl || !env.placereadyWebhookSecret || !studentIds.length) return;
  void (async () => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, date: true, venue: true, type: true, tenant: { select: { slug: true } } },
      });
      if (!event) return;
      const students = await prisma.student.findMany({
        where: { id: { in: [...new Set(studentIds)] } },
        select: { id: true, enrollment_number: true },
      });
      if (!students.length) return;
      const res = await fetch(env.placereadyWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sou-webhook-key': env.placereadyWebhookSecret },
        body: JSON.stringify({
          tenant_slug: event.tenant.slug,
          kind,
          event: { id: event.id, title: event.title, date: event.date.toISOString(), venue: event.venue, type: event.type },
          students: students.map((s) => ({ id: s.id, enrollment_number: s.enrollment_number })),
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) logger.warn({ status: res.status, eventId, kind }, 'PlaceReady webhook rejected');
    } catch (err) {
      logger.warn({ err, eventId, kind }, 'PlaceReady webhook failed');
    }
  })();
}
