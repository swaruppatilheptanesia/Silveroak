/**
 * @swagger
 * tags:
 *   - name: Announcements
 *     description: Announcements with publish/archive lifecycle and read receipts
 *
 * /api/announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: List announcements with filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published, archived] }
 *       - in: query
 *         name: target_audience
 *         schema: { type: string, enum: [all, batch, department, eligible_for_posting] }
 *     responses:
 *       200:
 *         description: Paginated announcements
 *   post:
 *     tags: [Announcements]
 *     summary: Create announcement (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, target_audience]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               target_audience: { type: string, enum: [all, batch, department, eligible_for_posting] }
 *               target_institutes: { type: array, items: { type: string }, maxItems: 1 }
 *               target_courses: { type: array, items: { type: string }, maxItems: 1 }
 *               target_branches: { type: array, items: { type: string }, maxItems: 1 }
 *               target_batch: { type: string }
 *               target_department: { type: string }
 *               posting_id: { type: string, format: uuid }
 *               requires_consent: { type: boolean }
 *     responses:
 *       201:
 *         description: Created (status=draft)
 *
 * /api/announcements/{announcementId}:
 *   get:
 *     tags: [Announcements]
 *     summary: Get announcement detail
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Announcement detail
 *   put:
 *     tags: [Announcements]
 *     summary: Update announcement (admin)
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /api/announcements/{announcementId}/publish:
 *   put:
 *     tags: [Announcements]
 *     summary: Publish or republish an announcement (admin)
 *     description: >
 *       Accepts a draft (first publish) or an archived announcement (republish — clears archived_at
 *       and returns it to the student feed). Notifies students and stamps published_at in both
 *       cases. An already-published announcement is rejected with 422 INVALID_ANNOUNCEMENT_STATUS.
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Published
 *       422:
 *         description: Announcement is already published
 *
 * /api/announcements/{announcementId}/archive:
 *   put:
 *     tags: [Announcements]
 *     summary: Archive announcement (admin)
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Archived
 *
 * /api/announcements/{announcementId}/read:
 *   post:
 *     tags: [Announcements]
 *     summary: Mark as read / give consent (student)
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               consent_given: { type: boolean }
 *     responses:
 *       200:
 *         description: Receipt recorded
 */
