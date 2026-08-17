/**
 * @swagger
 * tags:
 *   - name: Circulars
 *     description: Circular templates and generated circulars
 *
 * /api/circulars/templates:
 *   get:
 *     tags: [Circulars]
 *     summary: List circular templates
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Templates list
 *   post:
 *     tags: [Circulars]
 *     summary: Create circular template (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, content_template]
 *             properties:
 *               name: { type: string }
 *               type: { type: string }
 *               content_template: { type: string }
 *               variables: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Template created
 *
 * /api/circulars/templates/{templateId}:
 *   get:
 *     tags: [Circulars]
 *     summary: Get template detail
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Template detail
 *   put:
 *     tags: [Circulars]
 *     summary: Update template (admin)
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Circulars]
 *     summary: Delete template (admin)
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/circulars/generated:
 *   get:
 *     tags: [Circulars]
 *     summary: List generated circulars
 *     responses:
 *       200:
 *         description: Generated circulars list
 *   post:
 *     tags: [Circulars]
 *     summary: Generate circular from template (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [template_id, variable_values]
 *             properties:
 *               template_id: { type: string, format: uuid }
 *               variable_values: { type: object }
 *     responses:
 *       201:
 *         description: Circular generated
 */
