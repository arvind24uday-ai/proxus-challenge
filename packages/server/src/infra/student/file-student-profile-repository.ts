import { Effect, FileSystem, Layer, Path, Schema } from "effect";
import type { StudentProfile } from "@proxus/shared";
import { StudentProfile as StudentProfileSchema } from "@proxus/shared";
import { StudentProfileRepository } from "../../domain/student/StudentProfileRepository.ts";

const StudentProfileFromJson = Schema.fromJsonString(StudentProfileSchema);

const emptyProfile = (): StudentProfile => ({
  topics: [],
  lastUpdatedAt: new Date().toISOString()
});

export const FileStudentProfileRepository = {
  make: (directory: string) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const profilePath = path.join(directory, "student-profile.json");

      const getProfile = (): Effect.Effect<StudentProfile> =>
        Effect.gen(function* () {
          const exists = yield* fs.exists(profilePath).pipe(
            Effect.catch(() => Effect.succeed(false as boolean))
          );
          if (!exists) return emptyProfile();

          const text = yield* fs.readFileString(profilePath).pipe(
            Effect.catch(() => Effect.succeed(""))
          );
          if (text.trim().length === 0) return emptyProfile();

          return yield* Schema.decodeUnknownEffect(StudentProfileFromJson)(text).pipe(
            Effect.catch(() => Effect.succeed(emptyProfile()))
          );
        });

      const saveProfile = (profile: StudentProfile): Effect.Effect<void> =>
        Effect.gen(function* () {
          const encoded = yield* Schema.encodeUnknownEffect(StudentProfileSchema)(profile).pipe(
            Effect.catch(() => Effect.succeed(null as null))
          );
          if (encoded === null) return;
          const json = JSON.stringify(encoded, null, 2);
          yield* fs.makeDirectory(directory, { recursive: true }).pipe(
            Effect.catch(() => Effect.void)
          );
          yield* fs.writeFileString(profilePath, `${json}\n`).pipe(
            Effect.catch(() => Effect.void)
          );
        });

      return { getProfile, saveProfile };
    }),
  layer: (directory: string) =>
    Layer.effect(StudentProfileRepository)(FileStudentProfileRepository.make(directory))
};
