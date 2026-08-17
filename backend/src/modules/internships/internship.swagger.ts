/**
 * @swagger
 * tags:
 *   - name: Internships
 *     description: Internship tracking and issue management
 *
 * /api/internships/my:
 *   get:
 *     tags: [Internships]
 *     summary: List my internships with issues (student)
 *     responses:
 *       200:
 *         description: Internships list
 *
 * /api/internships:
 *   get:
 *     tags: [Internships]
 *     summary: List all internships (admin)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ongoing, completed, discontinued] }
 *       - in: query
 *         name: student_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated internships
 *   post:
 *     tags: [Internships]
 *     summary: Create internship record (student)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_name, role, internship_type, start_date]
 *             properties:
 *               company_name: { type: string }
 *               role: { type: string }
 *               internship_type: { type: string, enum: [paid, unpaid, stipend_based] }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *               stipend_amount: { type: number }
 *               is_receiving_stipend: { type: boolean }
 *     responses:
 *       201:
 *         description: Created
 *
 * /api/internships/{internshipId}:
 *   get:
 *     tags: [Internships]
 *     summary: Get internship detail with issues
 *     parameters:
 *       - in: path
 *         name: internshipId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Internship detail
 *   put:
 *     tags: [Internships]
 *     summary: Update internship (admin)
 *     parameters:
 *       - in: path
 *         name: internshipId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /api/internships/{internshipId}/issues:
 *   post:
 *     tags: [Internships]
 *     summary: Report an issue
 *     parameters:
 *       - in: path
 *         name: internshipId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Issue created
 *
 * /api/internships/issues/{issueId}/resolve:
 *   put:
 *     tags: [Internships]
 *     summary: Resolve an issue (admin)
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Resolved
 */
