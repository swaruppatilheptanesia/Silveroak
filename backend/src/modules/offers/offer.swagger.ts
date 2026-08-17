/**
 * @swagger
 * tags:
 *   - name: Offers
 *     description: Offer management - create, accept, reject, joining, compliance
 *
 * /api/offers:
 *   get:
 *     tags: [Offers]
 *     summary: List offers with filters (admin)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending_student_action, accepted, rejected_by_admin] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [job, internship] }
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: student_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated offers
 *   post:
 *     tags: [Offers]
 *     summary: Create an offer (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_id, posting_id, company_id, type, role, offer_date]
 *             properties:
 *               student_id: { type: string, format: uuid }
 *               posting_id: { type: string, format: uuid }
 *               company_id: { type: string, format: uuid }
 *               type: { type: string, enum: [job, internship] }
 *               role: { type: string }
 *               ctc: { type: string }
 *               stipend: { type: string }
 *               location: { type: string }
 *               offer_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Offer created (status=pending_student_action)
 *
 * /api/offers/my:
 *   get:
 *     tags: [Offers]
 *     summary: List my offers (student)
 *     responses:
 *       200:
 *         description: Student's offers
 *
 * /api/offers/{offerId}:
 *   get:
 *     tags: [Offers]
 *     summary: Get offer with audit trail (admin)
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Offer detail
 *
 * /api/offers/{offerId}/accept:
 *   put:
 *     tags: [Offers]
 *     summary: Accept offer (student)
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Accepted (is_locked=true)
 *       422:
 *         description: OFFER_NOT_PENDING
 *
 * /api/offers/{offerId}/reject:
 *   put:
 *     tags: [Offers]
 *     summary: Reject offer (admin)
 *     parameters:
 *       - in: path
 *         name: offerId
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
 *               rejection_remarks: { type: string }
 *     responses:
 *       200:
 *         description: Rejected
 *
 * /api/offers/{offerId}/joining:
 *   put:
 *     tags: [Offers]
 *     summary: Update joining status (admin, only for accepted offers)
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [joining_status]
 *             properties:
 *               joining_status: { type: string, enum: [joined, did_not_join] }
 *               joining_date: { type: string, format: date }
 *               dnj_reason: { type: string }
 *     responses:
 *       200:
 *         description: Joining status updated
 *
 * /api/offers/{offerId}/compliance:
 *   put:
 *     tags: [Offers]
 *     summary: Update compliance status (admin)
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [compliance_status]
 *             properties:
 *               compliance_status: { type: string, enum: [compliant, blocked, override_enabled] }
 *               applications_blocked: { type: boolean }
 *     responses:
 *       200:
 *         description: Compliance updated
 */
