import { Router } from 'express';
import * as ctrl from './student.controller';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import {
  certificationDocumentUpload,
  employmentDocumentUpload,
  profilePhotoUpload,
  resumeUpload,
} from '../../middleware/upload';
import {
  updatePersonalSchema,
  updateAcademicSchema,
  updateSkillsSchema,
  createProjectSchema,
  updateProjectSchema,
  createCertificationSchema,
  createEmploymentSchema,
  policyAcceptanceSchema,
  interestRegistrationSchema,
  globalPlacementOptOutSchema,
  postingTypePreferenceSchema,
} from './student.schema';

const router = Router();

// All routes require student role (auth + tenant already applied at app level)
router.use(requireRole('student'));
router.use(requireStudentProfileAccess);

// Profile
router.get('/me', ctrl.getMyProfile);
router.put('/me/personal', validate(updatePersonalSchema), ctrl.updatePersonal);
router.post('/me/profile-photo', profilePhotoUpload.single('file'), ctrl.uploadProfilePhoto);
router.put('/me/academic', validate(updateAcademicSchema), ctrl.updateAcademic);
router.put('/me/skills', validate(updateSkillsSchema), ctrl.updateSkills);

// Projects
router.get('/me/projects', ctrl.getProjects);
router.post('/me/projects', validate(createProjectSchema), ctrl.createProject);
router.put('/me/projects/:projectId', validate(updateProjectSchema), ctrl.updateProject);
router.delete('/me/projects/:projectId', ctrl.deleteProject);

// Certifications
router.get('/me/certifications', ctrl.getCertifications);
router.post('/me/certification-documents', certificationDocumentUpload.single('file'), ctrl.uploadCertificationDocument);
router.post('/me/certifications', validate(createCertificationSchema), ctrl.createCertification);
router.delete('/me/certifications/:certId', ctrl.deleteCertification);

// Employment (multiple entries). Add requires a mandatory offer-letter document; close requires a
// mandatory completion-proof document.
router.get('/me/employments', ctrl.listEmployments);
router.post('/me/employments', employmentDocumentUpload.single('file'), validate(createEmploymentSchema), ctrl.createEmployment);
router.post('/me/employments/:id/close', employmentDocumentUpload.single('file'), ctrl.closeEmployment);
router.delete('/me/employments/:id', ctrl.deleteEmployment);

// Resumes
router.get('/me/resumes', ctrl.getResumes);
router.post('/me/resumes', resumeUpload.single('file'), ctrl.uploadResume);
router.put('/me/resumes/:resumeId/default', ctrl.setDefaultResume);
router.delete('/me/resumes/:resumeId', ctrl.deleteResume);

// Policy Acceptance
router.post('/me/policy-acceptance', validate(policyAcceptanceSchema), ctrl.acceptPolicy);

// Interest Registration
router.get('/me/interests', ctrl.getInterests);
router.post('/me/interests', validate(interestRegistrationSchema), ctrl.registerInterests);

// Placement preferences (opt-out: global + per posting type)
router.get('/me/placement-preferences', ctrl.getPlacementPreferences);
router.put('/me/placement-preferences/global', validate(globalPlacementOptOutSchema), ctrl.updateGlobalPlacementOptOut);
router.put('/me/placement-preferences/posting-type', validate(postingTypePreferenceSchema), ctrl.updatePostingTypePreference);

export default router;
