import { useState } from 'react';
import type { Question } from '../../../shared/schema';
import { api, errorText } from '../api';
import { useData } from '../data';
import { Button, DomainSelect, inputClass, LETTERS, Modal, Notice } from './ui';

export function QuestionEditor({ question, onClose }: { question: Question; onClose: () => void }) {
  const { reload } = useData();
  const [domain, setDomain] = useState<string>(question.domain);
  const [objective, setObjective] = useState(question.objective ?? '');
  const [text, setText] = useState(question.question);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correct, setCorrect] = useState<number[]>(question.correct);
  const [explanation, setExplanation] = useState(question.explanation);
  const [optionExplanations, setOptionExplanations] = useState<string[]>(
    question.options.map((_, i) => question.optionExplanations?.[i] ?? ''),
  );
  const [tags, setTags] = useState((question.tags ?? []).join(', '));
  const [difficulty, setDifficulty] = useState(question.difficulty ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggleCorrect = (i: number) =>
    setCorrect((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const addOption = () => {
    setOptions((o) => [...o, '']);
    setOptionExplanations((o) => [...o, '']);
  };

  const removeOption = (i: number) => {
    setOptions((o) => o.filter((_, k) => k !== i));
    setOptionExplanations((o) => o.filter((_, k) => k !== i));
    setCorrect((c) => c.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
  };

  const save = async () => {
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const hasOptionExplanations = optionExplanations.some((e) => e.trim());
    const payload = {
      domain,
      objective: objective.trim() || undefined,
      question: text,
      options,
      correct,
      explanation,
      optionExplanations: hasOptionExplanations ? optionExplanations : undefined,
      tags: tagList.length ? tagList : undefined,
      difficulty: difficulty || undefined,
      source: question.source,
    };
    setBusy(true);
    try {
      await api.updateQuestion(question.id, payload);
      await reload();
      onClose();
    } catch (err) {
      setErrors([errorText(err)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit question" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="sm:col-span-2 block">
            <span className="text-sm text-muted">Domain</span>
            <DomainSelect value={domain} onChange={setDomain} className="w-full" />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Objective (e.g. 1.4)</span>
            <input className={`${inputClass} w-full`} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-muted">Question</span>
          <textarea className={`${inputClass} w-full h-28`} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div>
          <span className="text-sm text-muted">Options — tick every correct one</span>
          <div className="space-y-2 mt-1">
            {options.map((opt, i) => (
              <div key={i} className="border border-line rounded-md p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={correct.includes(i)}
                    onChange={() => toggleCorrect(i)}
                    aria-label={`Option ${LETTERS[i]} is correct`}
                  />
                  <span className="font-semibold w-5">{LETTERS[i]}</span>
                  <input
                    className={`${inputClass} flex-1`}
                    value={opt}
                    onChange={(e) => setOptions((o) => o.map((x, k) => (k === i ? e.target.value : x)))}
                  />
                  <Button size="sm" variant="ghost" disabled={options.length <= 2} onClick={() => removeOption(i)}>
                    Remove
                  </Button>
                </div>
                <input
                  className={`${inputClass} w-full text-sm`}
                  placeholder="Why this option is right or wrong (optional)"
                  value={optionExplanations[i] ?? ''}
                  onChange={(e) => setOptionExplanations((o) => o.map((x, k) => (k === i ? e.target.value : x)))}
                />
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2" disabled={options.length >= 8} onClick={addOption}>
            + Add option
          </Button>
        </div>
        <label className="block">
          <span className="text-sm text-muted">Explanation</span>
          <textarea className={`${inputClass} w-full h-28`} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-muted">Tags (comma separated)</span>
            <input className={`${inputClass} w-full`} value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Difficulty</span>
            <select className={`${inputClass} w-full`} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">—</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>
        </div>
        {errors.length > 0 && (
          <Notice tone="bad">
            <ul className="list-disc ml-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Notice>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
