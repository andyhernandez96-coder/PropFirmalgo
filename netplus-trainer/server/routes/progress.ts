import { Router } from 'express';
import { z } from 'zod';
import { localDay } from '../../shared/dates';
import { AttemptSchema, formatIssues, SessionSchema } from '../../shared/schema';
import type { Store } from '../store';

const AttemptBatchSchema = z.object({ attempts: z.array(AttemptSchema).min(1) });

export function progressRouter(store: Store): Router {
  const router = Router();

  router.get('/progress', (_req, res) => {
    res.json({ today: localDay(), attempts: store.progress.attempts, leitner: store.progress.leitner });
  });

  router.post('/attempts', async (req, res) => {
    const parsed = AttemptBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: formatIssues(parsed.error) });
      return;
    }
    res.json({ cards: await store.addAttempts(parsed.data.attempts) });
  });

  router.get('/sessions', (_req, res) => {
    res.json({ sessions: store.sessions });
  });

  router.post('/sessions', async (req, res) => {
    const parsed = SessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: formatIssues(parsed.error) });
      return;
    }
    await store.addSession(parsed.data);
    res.status(201).json({ session: parsed.data });
  });

  return router;
}
