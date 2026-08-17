/**
 * @swagger
 * tags:
 *   - name: Applications
 *     description: Application pipeline - apply, move stages, bulk operations
 *
 * /api/applications/apply:
 *   post:
 *     tags: [Applications]
 *     summary: Apply to a posting (student only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [posting_id]
 *             properties:
 *               posting_id: { type: string, format: uuid }
 *               resume_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Application created
 *       422:
 *         description: ALREADY_APPLIED, POSTING_NOT_PUBLISHED, or CGPA_NOT_MET
 *
 * /api/applications/my:
 *   get:
 *     tags: [Applications]
 *     summary: List my applications (student only)
 *     responses:
 *       200:
 *         description: Student's applications with posting info
 *
 * /api/applications:
 *   get:
 *     tags: [Applications]
 *     summary: List all applications with filters (admin only)
 *     parameters:
 *       - in: query
 *         name: posting_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: stage
 *         schema: { type: string, enum: [applied, mock_round, shortlisted, test_scheduled, interview, hr_round, offer_released, rejected] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated applications with student info
 *
 * /api/applications/{applicationId}:
 *   get:
 *     tags: [Applications]
 *     summary: Get application detail with stage history (admin only)
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Application with stage history
 *
 * /api/applications/{applicationId}/stage:
 *   put:
 *     tags: [Applications]
 *     summary: Move application to a new stage (admin only)
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stage]
 *             properties:
 *               stage: { type: string, enum: [applied, mock_round, shortlisted, test_scheduled, interview, hr_round, offer_released, rejected] }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Stage updated
 *       422:
 *         description: APPLICATION_REJECTED
 *
 * /api/applications/bulk/stage:
 *   put:
 *     tags: [Applications]
 *     summary: Bulk move applications to a stage (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [application_ids, stage]
 *             properties:
 *               application_ids: { type: array, items: { type: string, format: uuid }, maxItems: 100 }
 *               stage: { type: string, enum: [applied, mock_round, shortlisted, test_scheduled, interview, hr_round, offer_released, rejected] }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Bulk result with per-item status
 *
 * /api/applications/{applicationId}/mock-result:
 *   put:
 *     tags: [Applications]
 *     summary: Set mock round result (must be in mock_round stage)
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [result]
 *             properties:
 *               result: { type: string, enum: [passed, failed] }
 *     responses:
 *       200:
 *         description: Mock result set
 *       422:
 *         description: INVALID_STAGE_FOR_MOCK
 *
 * /api/applications/{applicationId}/withdraw:
 *   delete:
 *     tags: [Applications]
 *     summary: Withdraw application (student only, not after offer/rejection)
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Withdrawn
 *       422:
 *         description: CANNOT_WITHDRAW
 */
