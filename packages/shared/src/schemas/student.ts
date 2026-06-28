import { Schema } from "effect";

export const MasteryLevel = Schema.Union([
  Schema.Literal("unknown"),
  Schema.Literal("learning"),
  Schema.Literal("familiar"),
  Schema.Literal("mastered")
]);
export type MasteryLevel = typeof MasteryLevel.Type;

export const WrongAnswer = Schema.Struct({
  questionId: Schema.String,
  questionPrompt: Schema.String,
  studentAnswer: Schema.String,
  correctAnswer: Schema.String,
  attemptedAt: Schema.String
});
export type WrongAnswer = typeof WrongAnswer.Type;

export const StudentTopicState = Schema.Struct({
  topicId: Schema.String,
  topicLabel: Schema.String,
  attemptCount: Schema.Number,
  correctRate: Schema.Number,
  mastery: MasteryLevel,
  wrongAnswers: Schema.optional(Schema.Array(WrongAnswer))
});
export type StudentTopicState = typeof StudentTopicState.Type;

export const StudentProfile = Schema.Struct({
  topics: Schema.Array(StudentTopicState),
  lastUpdatedAt: Schema.String
});
export type StudentProfile = typeof StudentProfile.Type;

export const WeakTopicsResponse = Schema.Struct({
  topics: Schema.Array(StudentTopicState)
});
export type WeakTopicsResponse = typeof WeakTopicsResponse.Type;

export const MistakeRecord = Schema.Struct({
  questionId: Schema.String,
  questionPrompt: Schema.String,
  studentAnswer: Schema.String,
  correctAnswer: Schema.String,
  topicId: Schema.String,
  attemptedAt: Schema.String
});
export type MistakeRecord = typeof MistakeRecord.Type;
