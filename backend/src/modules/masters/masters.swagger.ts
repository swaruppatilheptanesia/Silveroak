/**
 * @swagger
 * components:
 *   schemas:
 *     MasterOption:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         category:
 *           type: string
 *           enum: [technology, skill, interest, branch, academic_year, policy_category, noc_type, posting_type]
 *         value: { type: string }
 *         target_institutes: { type: array, items: { type: string } }
 *         target_courses: { type: array, items: { type: string } }
 *         target_branches: { type: array, items: { type: string } }
 *         target_semesters: { type: array, items: { type: string } }
 *         is_active: { type: boolean }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     CreateMasterOptionInput:
 *       type: object
 *       required: [category, value]
 *       properties:
 *         category:
 *           type: string
 *           enum: [technology, skill, interest, branch, academic_year, policy_category, noc_type, posting_type]
 *         value: { type: string }
 *         target_institutes: { type: array, items: { type: string } }
 *         target_courses: { type: array, items: { type: string } }
 *         target_branches: { type: array, items: { type: string } }
 *         target_semesters: { type: array, items: { type: string } }
 *         is_active: { type: boolean }
 *     UpdateMasterOptionInput:
 *       type: object
 *       properties:
 *         value: { type: string }
 *         target_institutes: { type: array, items: { type: string } }
 *         target_courses: { type: array, items: { type: string } }
 *         target_branches: { type: array, items: { type: string } }
 *         target_semesters: { type: array, items: { type: string } }
 *         is_active: { type: boolean }
 */

/**
 * @swagger
 * /api/masters:
 *   get:
 *     summary: List active master options for the authenticated tenant
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [technology, skill, interest, branch, academic_year, policy_category, noc_type, posting_type]
 *     responses:
 *       200:
 *         description: Active master options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MasterOption'
 */

/**
 * @swagger
 * /api/admin/masters:
 *   get:
 *     summary: List tenant master options for TPO admins
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [technology, skill, interest, branch, academic_year, policy_category, noc_type, posting_type]
 *       - in: query
 *         name: include_inactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Tenant master options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MasterOption'
 *   post:
 *     summary: Create a tenant master option
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMasterOptionInput'
 *     responses:
 *       201:
 *         description: Master option created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MasterOption'
 */

/**
 * @swagger
 * /api/admin/masters/{masterId}:
 *   put:
 *     summary: Update a tenant master option
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: masterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMasterOptionInput'
 *     responses:
 *       200:
 *         description: Master option updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MasterOption'
 *   delete:
 *     summary: Delete a tenant master option
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: masterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Master option deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 */
