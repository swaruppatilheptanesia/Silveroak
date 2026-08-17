/**
 * @swagger
 * tags:
 *   - name: Postings
 *     description: Job/internship postings with publish/close lifecycle
 *
 * /api/postings:
 *   get:
 *     tags: [Postings]
 *     summary: List postings with search, filter, pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published, closed] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [job, internship, stipend_internship] }
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated postings with company info
 *   post:
 *     tags: [Postings]
 *     summary: Create a posting (starts as draft)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, title, type, academic_year, role_name, location, work_mode]
 *             properties:
 *               company_id: { type: string, format: uuid }
 *               title: { type: string }
 *               type: { type: string, enum: [job, internship, stipend_internship] }
 *               academic_year: { type: string }
 *               role_name: { type: string }
 *               location: { type: string }
 *               work_mode: { type: string, enum: [onsite, remote, hybrid] }
 *               ctc: { type: string }
 *               stipend: { type: string }
 *               eligible_branches: { type: array, items: { type: string } }
 *               min_cgpa: { type: number }
 *               max_backlogs: { type: integer }
 *               technical_rounds: { type: integer }
 *               hr_rounds: { type: integer }
 *     responses:
 *       201:
 *         description: Created (status=draft)
 *
 * /api/postings/{postingId}:
 *   get:
 *     tags: [Postings]
 *     summary: Get posting by ID
 *     parameters:
 *       - in: path
 *         name: postingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Posting detail with company and counts
 *   put:
 *     tags: [Postings]
 *     summary: Update posting (not allowed if closed)
 *     parameters:
 *       - in: path
 *         name: postingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *       422:
 *         description: POSTING_CLOSED
 *
 * /api/postings/{postingId}/publish:
 *   put:
 *     tags: [Postings]
 *     summary: Publish a draft posting
 *     parameters:
 *       - in: path
 *         name: postingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Published
 *       422:
 *         description: INVALID_POSTING_STATUS (not draft)
 *
 * /api/postings/{postingId}/close:
 *   put:
 *     tags: [Postings]
 *     summary: Close a posting
 *     parameters:
 *       - in: path
 *         name: postingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Closed
 *       422:
 *         description: POSTING_ALREADY_CLOSED
 */
