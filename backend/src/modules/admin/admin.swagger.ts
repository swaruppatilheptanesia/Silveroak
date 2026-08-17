/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: User management, student operations, audit logs, and permissions
 *
 * /api/admin/students:
 *   get:
 *     tags: [Admin]
 *     summary: List students for TPO admin management
 *     parameters:
 *       - in: query
 *         name: verification_status
 *         schema: { type: string, enum: [pending, verified, rejected] }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: batch
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: min_cgpa
 *         schema: { type: number }
 *       - in: query
 *         name: max_cgpa
 *         schema: { type: number }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated student list
 *
 * /api/admin/students/{studentId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a student record for TPO review
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Student detail
 *
 * /api/admin/students/{studentId}/verification:
 *   put:
 *     tags: [Admin]
 *     summary: Verify or reject a student profile
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [verified, rejected] }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Student verification updated
 *
 * /api/admin/students/verification/bulk:
 *   post:
 *     tags: [Admin]
 *     summary: Verify multiple pending students in one request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_ids]
 *             properties:
 *               student_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Bulk verification complete
 *
 * /api/admin/eligibility-rules:
 *   get:
 *     tags: [Admin]
 *     summary: List eligibility rules with computed student counts
 *     responses:
 *       200:
 *         description: Eligibility rules
 *   post:
 *     tags: [Admin]
 *     summary: Create an eligibility rule
 *     responses:
 *       201:
 *         description: Eligibility rule created
 *
 * /api/admin/eligibility-rules/{ruleId}:
 *   put:
 *     tags: [Admin]
 *     summary: Update an eligibility rule
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Eligibility rule updated
 *   delete:
 *     tags: [Admin]
 *     summary: Delete an eligibility rule
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Eligibility rule deleted
 *
 * /api/admin/portfolios:
 *   get:
 *     tags: [Admin]
 *     summary: Monitor portfolio status across students
 *     responses:
 *       200:
 *         description: Portfolio monitoring rows with stats
 *
 * /api/admin/selection-database:
 *   get:
 *     tags: [Admin]
 *     summary: Get normalized placement and internship selection records
 *     responses:
 *       200:
 *         description: Selection database
 *
 * /api/admin/interests/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Get student interest counts by interest type
 *     responses:
 *       200:
 *         description: Interest summary
 *
 * /api/admin/interests/registrations:
 *   get:
 *     tags: [Admin]
 *     summary: List students registered for interest types
 *     parameters:
 *       - in: query
 *         name: interest_type
 *         schema: { type: string }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Interest registrations
 *
 * /api/admin/crm/departments:
 *   get:
 *     tags: [Admin]
 *     summary: Fetch CRM departments by department type
 *     parameters:
 *       - in: query
 *         name: department_type
 *         required: true
 *         schema: { type: integer, enum: [1, 2] }
 *     responses:
 *       200:
 *         description: CRM departments
 *
 * /api/admin/crm/employees:
 *   get:
 *     tags: [Admin]
 *     summary: Fetch CRM employees for a department
 *     parameters:
 *       - in: query
 *         name: department_type
 *         required: true
 *         schema: { type: integer, enum: [1, 2] }
 *       - in: query
 *         name: department_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: CRM employees
 *
 * /api/admin/crm/employees/{empId}:
 *   get:
 *     tags: [Admin]
 *     summary: Fetch CRM employee details by employee code
 *     parameters:
 *       - in: path
 *         name: empId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: CRM employee detail
 *
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users with search and filters
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [student, tpo_admin, tpo_employee, faculty_coordinator, recruiter, management, super_admin] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated users
 *   post:
 *     tags: [Admin]
 *     summary: Create user (super_admin/tpo_admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, role]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               name: { type: string }
 *               role: { type: string, enum: [student, tpo_admin, tpo_employee, faculty_coordinator, recruiter, management, super_admin] }
 *               phone: { type: string }
 *               department: { type: string }
 *               designation: { type: string }
 *               crm_employee_code: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: EMAIL_EXISTS
 *
 * /api/admin/users/{userId}:
 *   put:
 *     tags: [Admin]
 *     summary: Update user (super_admin/tpo_admin)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name: { type: string }
 *               role: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List audit logs with filters
 *     parameters:
 *       - in: query
 *         name: module
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *
 * /api/admin/permissions:
 *   get:
 *     tags: [Admin]
 *     summary: List role permissions
 *     responses:
 *       200:
 *         description: Permissions list
 *   put:
 *     tags: [Admin]
 *     summary: Update role permissions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, permissions]
 *             properties:
 *               role: { type: string }
 *               permissions: { type: object }
 *     responses:
 *       200:
 *         description: Permissions updated
 */
