/**
 * @swagger
 * tags:
 *   - name: Companies
 *     description: Company management (TPO admin/employee)
 *   - name: Recruiters
 *     description: Recruiter management
 *   - name: Engagements
 *     description: Company engagement history
 *
 * /api/companies:
 *   get:
 *     tags: [Companies]
 *     summary: List companies with search, filter, pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: classification
 *         schema: { type: string, enum: [preferred, normal, blacklisted] }
 *     responses:
 *       200:
 *         description: Paginated companies
 *   post:
 *     tags: [Companies]
 *     summary: Create a company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               industry: { type: string }
 *               website: { type: string, format: uri }
 *               address: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Created company
 *
 * /api/companies/{companyId}:
 *   get:
 *     tags: [Companies]
 *     summary: Get company by ID (includes relation counts)
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Company detail
 *   put:
 *     tags: [Companies]
 *     summary: Update company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /api/companies/{companyId}/classification:
 *   put:
 *     tags: [Companies]
 *     summary: Classify company (preferred/normal/blacklisted)
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classification]
 *             properties:
 *               classification: { type: string, enum: [preferred, normal, blacklisted] }
 *               internal_remarks: { type: string }
 *     responses:
 *       200:
 *         description: Classified
 *
 * /api/companies/{companyId}/recruiters:
 *   get:
 *     tags: [Recruiters]
 *     summary: List recruiters for a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Recruiters list
 *   post:
 *     tags: [Recruiters]
 *     summary: Add recruiter to company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               designation: { type: string }
 *     responses:
 *       201:
 *         description: Created recruiter
 *
 * /api/recruiters/{recruiterId}:
 *   put:
 *     tags: [Recruiters]
 *     summary: Update recruiter
 *     parameters:
 *       - in: path
 *         name: recruiterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Recruiters]
 *     summary: Delete recruiter
 *     parameters:
 *       - in: path
 *         name: recruiterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/recruiters/{recruiterId}/verify:
 *   put:
 *     tags: [Recruiters]
 *     summary: Verify or reject recruiter
 *     parameters:
 *       - in: path
 *         name: recruiterId
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
 *               status: { type: string, enum: [verified, rejected] }
 *     responses:
 *       200:
 *         description: Verified
 *
 * /api/companies/{companyId}/engagements:
 *   get:
 *     tags: [Engagements]
 *     summary: List engagements for a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Engagements list
 *   post:
 *     tags: [Engagements]
 *     summary: Log company engagement
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visitor_type, date]
 *             properties:
 *               visitor_type: { type: string, enum: [placement, internship, campus_visit, guest_lecture, workshop] }
 *               date: { type: string, format: date }
 *               remarks: { type: string }
 *               students_hired: { type: integer }
 *               packages_offered: { type: string }
 *               academic_year: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
