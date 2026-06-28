import { Context, Effect } from "effect";
import type { StudentProfile, StudentTopicState } from "@proxus/shared";

export interface StudentProfileRepository {
  readonly getProfile: () => Effect.Effect<StudentProfile>;
  readonly saveProfile: (profile: StudentProfile) => Effect.Effect<void>;
}

export const StudentProfileRepository = Context.Service<StudentProfileRepository>(
  "@proxus/server/student/StudentProfileRepository"
);

export type { StudentProfile, StudentTopicState };
