import { Router } from 'express';
import { localDay } from '../../shared/dates';
import { BackupSchema, formatIssues } from '../../shared/schema';
import type { Store } from '../store';

export function backupRouter(store: Store): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="netplus-backup-${localDay()}.json"`);
    res.json(store.toBackup());
  });

  router.post('/restore', async (req, res) => {
    const parsed = BackupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: ['This is not a Network+ Trainer backup file.', ...formatIssues(parsed.error).slice(0, 5)] });
      return;
    }
    const safetyCopy = await store.restore(parsed.data);
    res.json({
      questions: parsed.data.questions.length,
      attempts: parsed.data.progress.attempts.length,
      sessions: parsed.data.sessions.length,
      safetyCopy,
    });
  });

  return router;
}
