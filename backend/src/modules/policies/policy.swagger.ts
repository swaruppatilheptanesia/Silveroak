/**
 * @swagger
 * tags:
 *   - name: Policies
 *     description: Placement policy management (TPO admin only)
 *
 * /api/policies:
 *   get:
 *     tags: [Policies]
 *     summary: List policies (student results are audience-filtered)
 *     responses:
 *       200:
 *         description: Policies list
 *   post:
 *     tags: [Policies]
 *     summary: Create policy (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string, description: Rich text HTML content }
 *               target_institutes: { type: array, maxItems: 1, items: { type: string } }
 *               target_branches: { type: array, maxItems: 1, items: { type: string } }
 *               target_courses: { type: array, maxItems: 1, items: { type: string } }
 *               document_url: { type: string, nullable: true }
 *               document_name: { type: string, nullable: true }
 *               document_mime_type: { type: string, nullable: true }
 *               document_size: { type: integer, nullable: true }
 *     responses:
 *       201:
 *         description: Created
 *
 * /api/policies/audience/institutes:
 *   get:
 *     tags: [Policies]
 *     summary: List CRM institutes for policy audience selection
 *     responses:
 *       200:
 *         description: Institute options
 *
 * /api/policies/audience/branches:
 *   get:
 *     tags: [Policies]
 *     summary: List CRM branches by course id
 *     parameters:
 *       - in: query
 *         name: CourseId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Branch options
 *
 * /api/policies/audience/courses:
 *   get:
 *     tags: [Policies]
 *     summary: List CRM courses by institute id
 *     parameters:
 *       - in: query
 *         name: InstituteId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Course options
 *
 * /api/policies/documents:
 *   post:
 *     tags: [Policies]
 *     summary: Upload a policy attachment document
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF, DOC, or DOCX policy document
 *     responses:
 *       201:
 *         description: Uploaded document metadata
 *
 * /api/policies/{policyId}:
 *   get:
 *     tags: [Policies]
 *     summary: Get policy detail
 *     parameters:
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Policy detail
 *   put:
 *     tags: [Policies]
 *     summary: Update policy (admin)
 *     parameters:
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Policies]
 *     summary: Delete policy (admin)
 *     parameters:
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
