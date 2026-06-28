import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ApiClient } from "../../api-client/client.ts";
import { apiRuntime } from "../../lib/runtime.ts";

export const studentProfileQuery = apiRuntime
  .atom(
    ApiClient.use((client) =>
      client.student.profile()
    ).pipe(Effect.withSpan("student.profile", { kind: "client" }))
  )
  .pipe(Atom.keepAlive, Atom.withReactivity(["student"]));

export const weakTopicsQuery = apiRuntime
  .atom(
    ApiClient.use((client) =>
      client.student.weakTopics()
    ).pipe(Effect.withSpan("student.weakTopics", { kind: "client" }))
  )
  .pipe(Atom.keepAlive, Atom.withReactivity(["student"]));
