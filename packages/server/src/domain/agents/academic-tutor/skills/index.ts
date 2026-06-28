export { UseUploadedMaterialsSkill } from "./use-uploaded-materials.ts";
export { CreateStudyArtifactsSkill } from "./create-study-artifacts.ts";
export { AdaptToStudentSkill } from "./adapt-to-student.ts";
export { GenerateRevisionPlanSkill } from "./generate-revision-plan.ts";
export { FocusedQuizSkill } from "./focused-quiz.ts";

import { UseUploadedMaterialsSkill } from "./use-uploaded-materials.ts";
import { CreateStudyArtifactsSkill } from "./create-study-artifacts.ts";
import { AdaptToStudentSkill } from "./adapt-to-student.ts";
import { GenerateRevisionPlanSkill } from "./generate-revision-plan.ts";
import { FocusedQuizSkill } from "./focused-quiz.ts";

export const AcademicTutorSkills = [
  UseUploadedMaterialsSkill,
  CreateStudyArtifactsSkill,
  AdaptToStudentSkill,
  GenerateRevisionPlanSkill,
  FocusedQuizSkill
] as const;
