import { Context, Effect, Layer } from "effect";
import type {
  MasteryLevel,
  MistakeRecord,
  StudentProfile,
  StudentTopicState,
  WrongAnswer,
  MultipleChoiceQuestion,
  ShortAnswerQuestion
} from "@proxus/shared";
import type { Artifact, GradedQuizAttempt, GradedTestAttempt } from "../artifacts/artifact.ts";
import { StudentProfileRepository } from "./StudentProfileRepository.ts";

export type GradedAttempt = GradedQuizAttempt | GradedTestAttempt;

export interface StudentProfileService {
  readonly getProfile: () => Effect.Effect<StudentProfile>;
  readonly getWeakTopics: () => Effect.Effect<readonly StudentTopicState[]>;
  readonly getMistakes: (topicId?: string) => Effect.Effect<readonly MistakeRecord[]>;
  readonly recordFromAttempt: (attempt: GradedAttempt, artifact: Artifact) => Effect.Effect<StudentProfile>;
}

export const StudentProfileService = Context.Service<StudentProfileService>(
  "@proxus/server/student/StudentProfileService"
);

const computeMastery = (attemptCount: number, correctRate: number): MasteryLevel => {
  if (attemptCount < 2) return "unknown";
  if (correctRate < 0.5) return "learning";
  if (correctRate < 0.8) return "familiar";
  return "mastered";
};

type TopicScores = Map<string, { topicLabel: string; score: number; maxScore: number }>;
type TopicWrongAnswers = Map<string, WrongAnswer[]>;

type AnyAnswer = { readonly questionId: string; readonly questionType: string } & Record<string, unknown>;

const extractTopicResults = (
  attempt: GradedAttempt,
  artifact: Artifact
): TopicScores => {
  const topicMap: TopicScores = new Map();

  if (artifact.kind === "note") return topicMap;

  const questions = artifact.questions;

  for (const correction of attempt.corrections) {
    const question = questions.find((q) => q.id === correction.questionId);
    const rawTopicId = (question as { topicId?: string } | undefined)?.topicId;
    const topicId = rawTopicId ?? artifact.id;
    const topicLabel = rawTopicId ?? artifact.title;

    const current = topicMap.get(topicId) ?? { topicLabel, score: 0, maxScore: 0 };

    let score = 0;
    let maxScore = 1;
    if (correction.questionType === "multiple-choice" || correction.questionType === "true-false") {
      score = correction.correct ? 1 : 0;
    } else if (correction.questionType === "short-answer") {
      score = correction.score;
      maxScore = correction.maxScore;
    }

    topicMap.set(topicId, {
      topicLabel: current.topicLabel,
      score: current.score + score,
      maxScore: current.maxScore + maxScore
    });
  }

  return topicMap;
};

const extractTopicWrongAnswers = (
  attempt: GradedAttempt,
  artifact: Artifact
): TopicWrongAnswers => {
  const wrongMap: TopicWrongAnswers = new Map();

  if (artifact.kind === "note") return wrongMap;

  const questions = artifact.questions;
  const answers = attempt.answers as readonly AnyAnswer[];
  const now = new Date().toISOString();

  for (const correction of attempt.corrections) {
    const isWrong =
      correction.questionType === "multiple-choice" || correction.questionType === "true-false"
        ? !correction.correct
        : correction.questionType === "short-answer"
          ? correction.score < correction.maxScore
          : false;

    if (!isWrong) continue;

    const question = questions.find((q) => q.id === correction.questionId);
    const rawTopicId = (question as { topicId?: string } | undefined)?.topicId;
    const topicId = rawTopicId ?? artifact.id;
    const answer = answers.find((a) => a.questionId === correction.questionId);

    let studentAnswer = "";
    let correctAnswer = "";

    if (correction.questionType === "multiple-choice" && question?.type === "multiple-choice") {
      const mcQuestion = question as MultipleChoiceQuestion;
      const selectedId = answer?.selectedOptionId as string | undefined;
      studentAnswer = mcQuestion.options.find((o) => o.id === selectedId)?.text ?? (selectedId ?? "");
      correctAnswer = mcQuestion.options.find((o) => o.id === correction.correctOptionId)?.text ?? correction.correctOptionId;
    } else if (correction.questionType === "true-false") {
      const boolAnswer = answer?.answer as boolean | undefined;
      studentAnswer = boolAnswer === undefined ? "" : boolAnswer ? "True" : "False";
      correctAnswer = correction.correctAnswer ? "True" : "False";
    } else if (correction.questionType === "short-answer" && question?.type === "short-answer") {
      studentAnswer = (answer?.answer as string | undefined) ?? "";
      correctAnswer = (question as ShortAnswerQuestion).expectedAnswer;
    }

    const record: WrongAnswer = {
      questionId: correction.questionId,
      questionPrompt: question?.prompt ?? "",
      studentAnswer,
      correctAnswer,
      attemptedAt: now
    };

    const existing = wrongMap.get(topicId) ?? [];
    wrongMap.set(topicId, [...existing, record]);
  }

  return wrongMap;
};

export const StudentProfileServiceLive = Layer.effect(
  StudentProfileService,
  Effect.gen(function* () {
    const repository = yield* StudentProfileRepository;

    const getProfile = (): Effect.Effect<StudentProfile> => repository.getProfile();

    const getWeakTopics = (): Effect.Effect<readonly StudentTopicState[]> =>
      repository.getProfile().pipe(
        Effect.map((profile) =>
          profile.topics.filter((t) =>
            t.mastery === "learning" || (t.mastery === "unknown" && t.attemptCount > 0)
          )
        )
      );

    const getMistakes = (topicId?: string): Effect.Effect<readonly MistakeRecord[]> =>
      repository.getProfile().pipe(
        Effect.map((profile) => {
          const topics = topicId
            ? profile.topics.filter((t) => t.topicId === topicId)
            : profile.topics;
          return topics.flatMap((t) =>
            (t.wrongAnswers ?? []).map((w): MistakeRecord => ({
              questionId: w.questionId,
              questionPrompt: w.questionPrompt,
              studentAnswer: w.studentAnswer,
              correctAnswer: w.correctAnswer,
              topicId: t.topicId,
              attemptedAt: w.attemptedAt
            }))
          );
        })
      );

    const recordFromAttempt = (attempt: GradedAttempt, artifact: Artifact): Effect.Effect<StudentProfile> =>
      Effect.gen(function* () {
        const profile = yield* repository.getProfile();
        const topicScores = extractTopicResults(attempt, artifact);
        const topicWrongAnswers = extractTopicWrongAnswers(attempt, artifact);

        if (topicScores.size === 0) return profile;

        const existingMap = new Map(profile.topics.map((t) => [t.topicId, t]));

        for (const [topicId, { topicLabel, score, maxScore }] of topicScores) {
          const existing = existingMap.get(topicId);
          const oldCount = existing?.attemptCount ?? 0;
          const oldRate = existing?.correctRate ?? 0;
          const attemptRate = maxScore > 0 ? score / maxScore : 0;
          const newCount = oldCount + 1;
          const newCorrectRate = (oldRate * oldCount + attemptRate) / newCount;

          const oldWrong: WrongAnswer[] = [...(existing?.wrongAnswers ?? [])];
          const newWrong = topicWrongAnswers.get(topicId) ?? [];
          const combined = [...oldWrong, ...newWrong].slice(-10);

          existingMap.set(topicId, {
            topicId,
            topicLabel,
            attemptCount: newCount,
            correctRate: newCorrectRate,
            mastery: computeMastery(newCount, newCorrectRate),
            wrongAnswers: combined
          });
        }

        const newProfile: StudentProfile = {
          topics: Array.from(existingMap.values()),
          lastUpdatedAt: new Date().toISOString()
        };

        yield* repository.saveProfile(newProfile);
        return newProfile;
      });

    return { getProfile, getWeakTopics, getMistakes, recordFromAttempt };
  })
);
