// Vercel function: GET /api/tickets. All behaviour lives in server/handlers.ts (ADR-0002).
import { listTickets } from '../../server/handlers.js';

export function GET(request: Request): Promise<Response> {
  return listTickets(request);
}
