/**
 * @swagger
 * tags:
 *   - name: NoDues
 *     description: No Dues Clearance requests with admin review and issuance
 *
 * /api/no-dues/my:
 *   get:
 *     tags: [NoDues]
 *     summary: List my no-dues requests (student)
 *     responses:
 *       200:
 *         description: Student's NDC requests
 *
 * /api/no-dues:
 *   get:
 *     tags: [NoDues]
 *     summary: List all no-dues requests (admin)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, under_review, approved, returned, rejected, issued] }
 *     responses:
 *       200:
 *         description: Paginated NDC requests
 *   post:
 *     tags: [NoDues]
 *     summary: Create no-dues request (student)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [declaration_accepted]
 *             properties:
 *               declaration_accepted: { type: boolean }
 *               proof_url: { type: string }
 *     responses:
 *       201:
 *         description: Created (status=pending)
 *       422:
 *         description: DECLARATION_REQUIRED
 *
 * /api/no-dues/proof:
 *   post:
 *     tags: [NoDues]
 *     summary: Upload no-dues proof attachment (student)
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Proof attachment uploaded
 *
 * /api/no-dues/{ndcId}:
 *   get:
 *     tags: [NoDues]
 *     summary: Get NDC detail
 *     parameters:
 *       - in: path
 *         name: ndcId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: NDC detail
 *
 * /api/no-dues/{ndcId}/review:
 *   put:
 *     tags: [NoDues]
 *     summary: Review NDC request (admin)
 *     parameters:
 *       - in: path
 *         name: ndcId
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
 *               status: { type: string, enum: [under_review, approved, returned, rejected] }
 *               admin_remarks: { type: string }
 *     responses:
 *       200:
 *         description: Review updated
 *
 * /api/no-dues/{ndcId}/issue:
 *   put:
 *     tags: [NoDues]
 *     summary: Issue NDC with generated number (admin, only if approved)
 *     parameters:
 *       - in: path
 *         name: ndcId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Issued with NDC number
 *
 * /api/no-dues/eligibility/enable:
 *   post:
 *     tags: [NoDues]
 *     summary: Enable no-dues eligibility for a single enrollment number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enrollment_number]
 *             properties:
 *               enrollment_number: { type: string }
 *     responses:
 *       200:
 *         description: Eligibility enabled for the matched student
 */
