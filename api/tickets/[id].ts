// Vercel function: GET /api/tickets/:id. All behaviour lives in server/handlers.ts (ADR-0002).
import { getTicket } from '../../server/handlers.js';

export function GET(request: Request): Promise<Response> {
  return getTicket(request);
}
