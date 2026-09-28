import express, { type NextFunction, type Request, type Response } from 'express';
import { inboxLog, startInboxWatcher } from './inbox';
import { progressRouter } from './routes/progress';
import { questionsRouter } from './routes/questions';
import { DATA_DIR, INBOX_DIR, Store } from './store';

const PORT = 3001;

async function main() {
  const store = new Store();
  await store.init();

  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/info', (_req, res) => {
    res.json({ dataDir: DATA_DIR, inboxDir: INBOX_DIR });
  });
  app.use('/api/questions', questionsRouter(store));
  app.use('/api', progressRouter(store));
  app.get('/api/inbox/log', (_req, res) => {
    res.json({ inboxDir: INBOX_DIR, entries: inboxLog() });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ errors: ['unknown API route'] });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { type?: string; status?: number; message?: string };
    if (e.type === 'entity.parse.failed') {
      res.status(400).json({ errors: ['The request body is not valid JSON'] });
      return;
    }
    if (e.type === 'entity.too.large') {
      res.status(413).json({ errors: ['The request is too large (max 25 MB)'] });
      return;
    }
    console.error('[api] unexpected error:', err);
    res.status(500).json({ errors: [e.message ?? 'internal error'] });
  });

  // Only reachable from this computer.
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[api] ready on http://127.0.0.1:${PORT}`);
    console.log(`[api] your data lives in ${DATA_DIR}`);
    console.log(`[api] drop .json files into ${INBOX_DIR} to import them automatically`);
  });

  startInboxWatcher(store);
}

main().catch((err) => {
  console.error('[api] could not start:', err);
  process.exit(1);
});
