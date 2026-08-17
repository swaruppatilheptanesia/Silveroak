/**
 * @swagger
 * tags:
 *   - name: Portfolio
 *     description: Student portfolio with projects and internship showcases
 *
 * /api/portfolio/my:
 *   get:
 *     tags: [Portfolio]
 *     summary: Get my portfolio (auto-creates if not exists)
 *     responses:
 *       200:
 *         description: Portfolio with projects and showcases
 *
 * /api/portfolio/my/projects:
 *   post:
 *     tags: [Portfolio]
 *     summary: Add project to portfolio
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
 *               tech_stack: { type: array, items: { type: string } }
 *               project_url: { type: string }
 *               github_url: { type: string }
 *               display_order: { type: integer }
 *     responses:
 *       201:
 *         description: Project added
 *
 * /api/portfolio/my/projects/{projectId}:
 *   put:
 *     tags: [Portfolio]
 *     summary: Update project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Portfolio]
 *     summary: Delete project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/portfolio/my/showcases:
 *   post:
 *     tags: [Portfolio]
 *     summary: Add internship showcase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_name, role]
 *             properties:
 *               company_name: { type: string }
 *               role: { type: string }
 *               description: { type: string }
 *               linked_internship_id: { type: string, format: uuid }
 *               display_order: { type: integer }
 *     responses:
 *       201:
 *         description: Showcase added
 *
 * /api/portfolio/my/showcases/{showcaseId}:
 *   put:
 *     tags: [Portfolio]
 *     summary: Update showcase
 *     parameters:
 *       - in: path
 *         name: showcaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Portfolio]
 *     summary: Delete showcase
 *     parameters:
 *       - in: path
 *         name: showcaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/portfolio/{studentId}:
 *   get:
 *     tags: [Portfolio]
 *     summary: View student portfolio (admin/recruiter)
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Student portfolio
 */
