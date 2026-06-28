import { useState } from "react";
import { useAtomValue } from "@effect/atom-react";
import type { StudentTopicState, WrongAnswer } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { studentProfileQuery } from "../domain/student/atoms.ts";

function MistakeItem({ mistake }: { readonly mistake: WrongAnswer }) {
  return (
    <li className="rounded-xl bg-slate-950/70 p-3 text-xs">
      <p className="mb-1.5 font-medium text-slate-300">{mistake.questionPrompt}</p>
      <div className="flex flex-col gap-0.5">
        <span className="text-red-400">Your answer: {mistake.studentAnswer}</span>
        <span className="text-emerald-400">Correct: {mistake.correctAnswer}</span>
      </div>
    </li>
  );
}

function TopicMistakes({ topic }: { readonly topic: StudentTopicState }) {
  const [expanded, setExpanded] = useState(false);
  const wrongs = topic.wrongAnswers ?? [];
  if (wrongs.length === 0) return null;

  const visible = expanded ? wrongs : wrongs.slice(-3);

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left hover:border-amber-800/60"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="text-xs font-semibold text-amber-300">{topic.topicLabel}</span>
        <span className="shrink-0 text-slate-500 text-xs">
          {wrongs.length} mistake{wrongs.length === 1 ? "" : "s"} {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <ul className="mt-1.5 flex flex-col gap-1.5 pl-2">
          {visible.map((m) => (
            <MistakeItem key={`${m.questionId}-${m.attemptedAt}`} mistake={m} />
          ))}
        </ul>
      )}

      {!expanded && wrongs.length > 3 && (
        <p className="mt-1 pl-3 text-slate-600 text-xs">
          +{wrongs.length - 3} more — click to expand
        </p>
      )}
    </li>
  );
}

export function MistakeHistory() {
  const profile = useAtomValue(studentProfileQuery);

  return AsyncResult.matchWithError(profile, {
    onInitial: () => null,
    onError: () => null,
    onDefect: () => null,
    onSuccess: ({ value }) => {
      const topicsWithMistakes = value.topics.filter((t) => (t.wrongAnswers?.length ?? 0) > 0);
      if (topicsWithMistakes.length === 0) return null;

      return (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Mistakes</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {topicsWithMistakes.map((topic) => (
              <TopicMistakes key={topic.topicId} topic={topic} />
            ))}
          </ul>
        </section>
      );
    }
  });
}
