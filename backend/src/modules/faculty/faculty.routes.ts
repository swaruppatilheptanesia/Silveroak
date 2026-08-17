import { Router } from 'express';
import * as ctrl from './faculty.controller';
import { requirePermission } from '../../middleware/permission';
import { requireRole } from '../../middleware/role';
import { scopeToDepartment } from '../../middleware/scope';
import { validate } from '../../middleware/validate';
import { queryFacultyStudentsSchema, queryProgramStudentsSchema } from './faculty.schema';

const router = Router();

router.use(requireRole('faculty_coordinator'));
router.use(scopeToDepartment());

router.get('/dashboard', requirePermission('students', 'view'), ctrl.getDashboard);
router.get('/programs', requirePermission('students', 'view'), ctrl.getPrograms);
router.get('/programs/students', requirePermission('students', 'view'), validate(queryProgramStudentsSchema, 'query'), ctrl.getProgramStudents);
router.get('/students', requirePermission('students', 'view'), validate(queryFacultyStudentsSchema, 'query'), ctrl.getStudents);
router.get('/students/filter-options', requirePermission('students', 'view'), ctrl.getStudentFilterOptions);
router.get('/students/:studentId', requirePermission('students', 'view'), ctrl.getStudentById);

export default router;
