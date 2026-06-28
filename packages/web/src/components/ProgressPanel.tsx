import { useAtomValue } from "@effect/atom-react";
import type { MasteryLevel, StudentTopicState } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { studentProfileQuery } from "../domain/student/atoms.ts";

const masteryConfig: Record<MasteryLevel, { label: string; color: string; barColor: string; width: (rate: number) => string }> = {
  mastered: {
    label: "Mastered",
    color: "text-emerald-300",
    barColor: "bg-emerald-400",
    width: (rate) => `${Math.round(rate * 100)}%`
  },
  familiar: {
    label: "Familiar",
    color: "text-sky-300",
    barColor: "bg-sky-400",
    width: (rate) => `${Math.round(rate * 100)}%`
  },
  learning: {
    label: "Learning",
    color: "text-amber-300",
    barColor: "bg-amber-400",
    width: (rate) => `${Math.round(rate * 100)}%`
  },
  unknown: {
    label: "Unknown",
    color: "text-slate-400",
    barColor: "bg-slate-600",
    width: () => "8%"
  }
};

interface ProgressPanelProps {
  readonly onSendMessage?: ((message: string) => void) | undefined;
}

function TopicBar({ topic }: { readonly topic: StudentTopicState }) {
  const config = masteryConfig[topic.mastery];
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-slate-200 text-xs font-medium" title={topic.topicLabel}>
          {topic.topicLabel}
        </span>
        <span className={`shrink-0 text-xs font-semibold ${config.color}`}>{config.label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
          style={{ width: config.width(topic.correctRate) }}
        />
      </div>
      <span className="text-slate-500 text-xs">{topic.attemptCount} attempt{topic.attemptCount === 1 ? "" : "s"} · {Math.round(topic.correctRate * 100)}% correct</span>
    </li>
  );
}

export function ProgressPanel({ onSendMessage }: ProgressPanelProps) {
  const profile = useAtomValue(studentProfileQuery);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Progress</h2>
      </div>
      {AsyncResult.matchWithError(profile, {
        onInitial: () => null,
        onError: () => null,
        onDefect: () => null,
        onSuccess: ({ value }) =>
          value.topics.length === 0
            ? (
                <p className="text-slate-500 text-sm">Complete a quiz to start tracking your progress.</p>
              )
            : (
                <>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <ul className="flex flex-col gap-3">
                      {value.topics
                        .slice()
                        .sort((a, b) => {
                          const order: Record<MasteryLevel, number> = { learning: 0, unknown: 1, familiar: 2, mastered: 3 };
                          return order[a.mastery] - order[b.mastery];
                        })
                        .map((topic) => (
                          <TopicBar key={topic.topicId} topic={topic} />
                        ))}
                    </ul>
                  </div>

                  {onSendMessage !== undefined && (
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left text-slate-200 text-xs font-medium hover:border-sky-400 transition"
                        onClick={() => onSendMessage("Generate a revision plan based on my weak topics")}
                      >
                        Get Revision Plan
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left text-slate-200 text-xs font-medium hover:border-sky-400 transition"
                        onClick={() => onSendMessage("Create a focused quiz on my weakest topics")}
                      >
                        Focused Quiz
                      </button>
                    </div>
                  )}
                </>
              )
      })}
    </section>
  );
}
