import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { StudentProfile, WeakTopicsResponse } from "../schemas/student.ts";

export class StudentApi extends HttpApiGroup.make("student")
  .add(
    HttpApiEndpoint.get("profile", "/profile", {
      success: StudentProfile
    }),
    HttpApiEndpoint.get("weakTopics", "/weak-topics", {
      success: WeakTopicsResponse
    })
  )
  .prefix("/student")
{}
