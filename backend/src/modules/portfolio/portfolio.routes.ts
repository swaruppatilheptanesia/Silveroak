import { Router } from 'express';
import * as ctrl from './portfolio.controller';
import { requireStudentProfileAccess } from '../../middleware/student-access';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/role';
import { portfolioShowcaseProofUpload } from '../../middleware/upload';
import { createPortfolioProjectSchema, updatePortfolioProjectSchema, createShowcaseSchema, updatePortfolioStatusSchema } from './portfolio.schema';

const router = Router();
// Student-only gates are scoped to /me so they do NOT block the staff /:studentId route below —
// every student route lives under /me, while /:studentId carries its own (staff) role guard.
router.use('/me', requireRole('student'), requireStudentProfileAccess);

router.get('/me', ctrl.getMyPortfolio);
router.put('/me/status', validate(updatePortfolioStatusSchema), ctrl.updateStatus);

// Projects
router.post('/me/projects', validate(createPortfolioProjectSchema), ctrl.addProject);
router.put('/me/projects/:projectId', validate(updatePortfolioProjectSchema), ctrl.updateProject);
router.delete('/me/projects/:projectId', ctrl.deleteProject);

// Showcases
router.post('/me/showcases/proof', portfolioShowcaseProofUpload.single('file'), ctrl.uploadShowcaseProof);
router.post('/me/showcases', validate(createShowcaseSchema), ctrl.addShowcase);
router.delete('/me/showcases/:showcaseId', ctrl.deleteShowcase);

router.get('/:studentId', requireRole('tpo_admin', 'tpo_employee', 'faculty_coordinator', 'super_admin'), ctrl.getStudentPortfolio);

export default router;
