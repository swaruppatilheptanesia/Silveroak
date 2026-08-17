/**
 * @swagger
 * tags:
 *   - name: NOC Templates
 *     description: Master-backed NOC certificate templates
 *
 * /api/noc/templates:
 *   get:
 *     tags: [NOC Templates]
 *     summary: List NOC templates visible to reviewers
 *     responses:
 *       200:
 *         description: Template list
 *
 * /api/noc/templates/{postingTypeMasterId}:
 *   get:
 *     tags: [NOC Templates]
 *     summary: Get a template for a posting type
 *     parameters:
 *       - in: path
 *         name: postingTypeMasterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Template detail
 *
 * /api/admin/masters/noc-templates:
 *   get:
 *     tags: [NOC Templates]
 *     summary: List NOC templates for TPO admins
 *     responses:
 *       200:
 *         description: Template list
 *
 * /api/admin/masters/noc-templates/{postingTypeMasterId}:
 *   get:
 *     tags: [NOC Templates]
 *     summary: Get a template for a posting type
 *     parameters:
 *       - in: path
 *         name: postingTypeMasterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Template detail
 *   put:
 *     tags: [NOC Templates]
 *     summary: Create or update an NOC template for a posting type
 *     parameters:
 *       - in: path
 *         name: postingTypeMasterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, subject, body_html]
 *             properties:
 *               name: { type: string }
 *               subject: { type: string }
 *               body_html: { type: string }
 *     responses:
 *       200:
 *         description: Saved
 */
