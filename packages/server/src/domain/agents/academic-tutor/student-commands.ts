import { Effect } from "effect";
import * as AgentCli from "../harness/index.ts";
import type { StudentProfile } from "@proxus/shared";
import type { ArtifactRepository } from "../../artifacts/artifact.ts";
import type { GradedAttempt, StudentProfileService } from "../../student/StudentProfileService.ts";

const renderProfile = (profile: StudentProfile): string => {
  if (profile.topics.length === 0) {
    return "No topic data recorded yet. Complete a quiz or test to start tracking mastery.";
  }
  const lines = profile.topics.map((t) =>
    `- ${t.topicLabel} (${t.topicId}): mastery=${t.mastery}, correctRate=${(t.correctRate * 100).toFixed(0)}%, attempts=${t.attemptCount}`
  );
  return `Student profile (${profile.topics.length} topics):\n${lines.join("\n")}`;
};

export const makeStudentCommands = (
  artifactRepository: ArtifactRepository,
  studentProfileService: StudentProfileService
) => {
  const profile = AgentCli.Command.withExamples([
    { command: "student profile", description: "Show the student mastery profile" }
  ])(
    AgentCli.Command.withDescription("Show the student knowledge profile with mastery per topic")(
      AgentCli.Command.exec("profile", {}, () =>
        studentProfileService.getProfile().pipe(Effect.map(renderProfile))
      )
    )
  );

  const weakTopics = AgentCli.Command.withExamples([
    { command: "student weak-topics", description: "List topics the student is struggling with" }
  ])(
    AgentCli.Command.withDescription("List weak topics (mastery: learning or unknown with attempts)")(
      AgentCli.Command.exec("weak-topics", {}, () =>
        studentProfileService.getWeakTopics().pipe(
          Effect.map((topics) =>
            topics.length === 0
              ? "No weak topics identified yet. Profile builds with more practice."
              : `Weak topics (${topics.length}):\n${topics.map((t) => `- ${t.topicLabel}: correctRate=${(t.correctRate * 100).toFixed(0)}%, attempts=${t.attemptCount}`).join("\n")}`
          )
        )
      )
    )
  );

  const mistakes = AgentCli.Command.withExamples([
    { command: "student mistakes", description: "Show wrong answers across all topics" },
    { command: "student mistakes photosynthesis", description: "Show wrong answers for a specific topic" }
  ])(
    AgentCli.Command.withDescription("Show recorded wrong answers, optionally filtered by topicId")(
      AgentCli.Command.exec("mistakes", {
        topicId: AgentCli.Argument.optionalString("topicId").pipe(
          AgentCli.Argument.withDescription("Optional topicId to filter by a single topic")
        )
      }, ({ topicId }) =>
        studentProfileService.getMistakes(topicId).pipe(
          Effect.map((records) => {
            if (records.length === 0) {
              return JSON.stringify({ mistakes: [], message: "No mistakes recorded yet" }, null, 2);
            }

            if (topicId !== undefined) {
              const capped = records.slice(-10);
              return JSON.stringify({ topicId, mistakes: capped }, null, 2);
            }

            // Group by topic, cap 5 most recent per topic
            const byTopic = new Map<string, typeof records[number][]>();
            for (const r of records) {
              const list = byTopic.get(r.topicId) ?? [];
              byTopic.set(r.topicId, [...list, r]);
            }
            const grouped: Record<string, unknown> = {};
            for (const [tid, list] of byTopic) {
              grouped[tid] = list.slice(-5);
            }
            return JSON.stringify({ mistakes: grouped }, null, 2);
          })
        )
      )
    )
  );

  const record = AgentCli.Command.withExamples([
    { command: "student record attempt123", description: "Record a graded attempt into the student profile" }
  ])(
    AgentCli.Command.withDescription("Record a graded quiz/test attempt to update mastery tracking")(
      AgentCli.Command.exec("record", {
        attemptId: AgentCli.Argument.string("attemptId").pipe(
          AgentCli.Argument.withDescription("Graded attempt id")
        )
      }, ({ attemptId }) =>
        Effect.gen(function* () {
          const attempt = yield* artifactRepository.getAttempt(attemptId);
          if (attempt.status !== "graded") {
            return `Attempt ${attemptId} is not graded yet. Run "artifacts grade ${attemptId}" first.`;
          }
          const artifact = yield* artifactRepository.getArtifact(attempt.artifactId);
          const graded = attempt as GradedAttempt;
          const updatedProfile = yield* studentProfileService.recordFromAttempt(graded, artifact);
          return renderProfile(updatedProfile);
        }).pipe(
          Effect.catch((err) => Effect.succeed(`Could not record attempt: ${String(err)}`))
        )
      )
    )
  );

  return AgentCli.Command.group("student", [profile, weakTopics, mistakes, record] as const).pipe(
    AgentCli.Command.withDescription("Student knowledge tracking: profile, weak topics, mistakes, and attempt recording")
  );
};
