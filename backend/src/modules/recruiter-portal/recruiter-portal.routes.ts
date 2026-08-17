import { Router } from 'express';
import * as ctrl from './recruiter-portal.controller';
import { requireRole } from '../../middleware/role';
import { piiFilter } from '../../middleware/pii-filter';
import { validate } from '../../middleware/validate';
import { updateRecruiterProfileSchema } from './recruiter-portal.schema';

const router = Router();
router.use(requireRole('recruiter'));
router.use(piiFilter());

router.get('/dashboard', ctrl.getDashboard);
router.get('/company', ctrl.getCompany);
router.put('/profile', validate(updateRecruiterProfileSchema), ctrl.updateProfile);
router.get('/companies/:companyId/postings', ctrl.getPostings);
router.get('/postings/:postingId/applications', ctrl.getApplications);

export default router;
