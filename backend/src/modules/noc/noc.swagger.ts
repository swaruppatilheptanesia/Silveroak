/**
 * @swagger
 * tags:
 *   - name: NOC
 *     description: NOC requests with dual approval chain (faculty → TPO → issue)
 *
 * /api/noc/my:
 *   get:
 *     tags: [NOC]
 *     summary: List my NOC requests (student)
 *     responses:
 *       200:
 *         description: NOC list
 *
 * /api/noc:
 *   get:
 *     tags: [NOC]
 *     summary: List all NOC requests (admin/faculty)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending_faculty, pending_tpo, pending_company_verification, approved, issued, rejected] }
 *       - in: query
 *         name: noc_type
 *         schema: { type: string, enum: [internship, training, project] }
 *     responses:
 *       200:
 *         description: Paginated NOCs
 *   post:
 *     tags: [NOC]
 *     summary: Create NOC request (student)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [noc_type, program, placement_source, company_name, role_title, start_date, end_date]
 *             properties:
 *               noc_type: { type: string, enum: [internship, training, project] }
 *               program: { type: string, enum: [summer_internship, winter_internship, final_semester_internship, nep_internship, stipend_internship, dissertation, industrial_training] }
 *               placement_source: { type: string, enum: [university_drive, self_sourced] }
 *               company_name: { type: string }
 *               role_title: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *               stipend_amount: { type: number }
 *     responses:
 *       201:
 *         description: Created (status=pending_faculty)
 *
 * /api/noc/{nocId}:
 *   get:
 *     tags: [NOC]
 *     summary: Get NOC detail
 *     parameters:
 *       - in: path
 *         name: nocId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: NOC detail
 *
 * /api/noc/{nocId}/faculty-approve:
 *   put:
 *     tags: [NOC]
 *     summary: Faculty approve (faculty_coordinator role)
 *     parameters:
 *       - in: path
 *         name: nocId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status → pending_tpo
 *
 * /api/noc/{nocId}/tpo-approve:
 *   put:
 *     tags: [NOC]
 *     summary: TPO approve (admin role)
 *     parameters:
 *       - in: path
 *         name: nocId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status → approved
 *
 * /api/noc/{nocId}/reject:
 *   put:
 *     tags: [NOC]
 *     summary: Reject NOC
 *     parameters:
 *       - in: path
 *         name: nocId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejection_reason]
 *             properties:
 *               rejection_reason: { type: string }
 *     responses:
 *       200:
 *         description: Rejected
 *
 * /api/noc/{nocId}/issue:
 *   put:
 *     tags: [NOC]
 *     summary: Issue NOC with generated number (admin, only if approved)
 *     parameters:
 *       - in: path
 *         name: nocId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Issued with NOC number
 */
