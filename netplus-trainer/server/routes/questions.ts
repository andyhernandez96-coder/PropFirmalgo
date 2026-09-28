import { Router } from 'express';
import { extractQuestionArray } from '../../shared/importer';
import type { Store } from '../store';

export function questionsRouter(store: Store): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { domain, objective, tag, q } = req.query as Record<string, string | undefined>;
    const needle = q?.trim().toLowerCase();
    const questions = store.questions.filter((item) => {
      if (domain && item.domain !== domain) return false;
      if (objective && item.objective !== objective) return false;
      if (tag && !item.tags?.includes(tag)) return false;
      if (needle) {
        const haystack = [item.question, ...item.options, item.explanation, ...(item.tags ?? [])].join(' ').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    res.json({ questions });
  });

  router.post('/import', async (req, res) => {
    const items = extractQuestionArray(req.body);
    if (!items) {
      res.status(400).json({ errors: ['Send a list of questions: [ {...}, {...} ]'] });
      return;
    }
    res.json(await store.importQuestions(items));
  });

  router.put('/:id', async (req, res) => {
    const result = await store.updateQuestion(req.params.id, req.body);
    if (result.ok) res.json({ question: result.question });
    else res.status(result.status).json({ errors: result.errors });
  });

  router.delete('/:id', async (req, res) => {
    if (await store.deleteQuestion(req.params.id)) res.status(204).end();
    else res.status(404).json({ errors: ['question not found'] });
  });

  return router;
}
