/**
 * @swagger
 * tags:
 *   - name: Students
 *     description: Student profile, projects, certifications, employment, resumes, policy, interests
 *
 * /api/students/me:
 *   get:
 *     tags: [Students]
 *     summary: Get my profile (student, academic, skills, employment)
 *     responses:
 *       200:
 *         description: Student profile with related data
 *
 * /api/students/me/personal:
 *   put:
 *     tags: [Students]
 *     summary: Update student-editable personal fields
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alternate_phone: { type: string }
 *               linkedin_url: { type: string }
 *     responses:
 *       200:
 *         description: Updated student
 *
 * /api/students/me/profile-photo:
 *   post:
 *     tags: [Students]
 *     summary: Upload or replace profile photo
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
 *       200:
 *         description: Updated student with the new profile photo URL
 *
 * /api/students/me/academic:
 *   put:
 *     tags: [Students]
 *     summary: Update academic profile (upsert)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cgpa: { type: number, maximum: 10 }
 *               semester: { type: integer }
 *               tenth_percentage: { type: number, maximum: 100 }
 *               twelfth_percentage: { type: number, maximum: 100 }
 *     responses:
 *       200:
 *         description: Academic profile
 *
 * /api/students/me/skills:
 *   put:
 *     tags: [Students]
 *     summary: Update skills profile (upsert)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               technical_skills: { type: array, items: { type: string } }
 *               domain_interests: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Skills profile
 *
 * /api/students/me/projects:
 *   get:
 *     tags: [Students]
 *     summary: List my projects
 *     responses:
 *       200:
 *         description: Projects list
 *   post:
 *     tags: [Students]
 *     summary: Create a project
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
 *               technologies: { type: array, items: { type: string } }
 *               github_url: { type: string }
 *     responses:
 *       201:
 *         description: Created project
 *
 * /api/students/me/projects/{projectId}:
 *   put:
 *     tags: [Students]
 *     summary: Update a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated project
 *   delete:
 *     tags: [Students]
 *     summary: Delete a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/students/me/certifications:
 *   get:
 *     tags: [Students]
 *     summary: List certifications
 *     responses:
 *       200:
 *         description: Certifications list
 *   post:
 *     tags: [Students]
 *     summary: Add certification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, issuer]
 *             properties:
 *               name: { type: string }
 *               issuer: { type: string }
 *               credential_url: { type: string }
 *     responses:
 *       201:
 *         description: Created
 *
 * /api/students/me/certifications/{certId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete certification
 *     parameters:
 *       - in: path
 *         name: certId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/students/me/employment:
 *   get:
 *     tags: [Students]
 *     summary: Get current employment
 *     responses:
 *       200:
 *         description: Employment info
 *   put:
 *     tags: [Students]
 *     summary: Update employment (upsert)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_currently_working: { type: boolean }
 *               employment_type: { type: string }
 *               company_name: { type: string }
 *               designation: { type: string }
 *     responses:
 *       200:
 *         description: Employment
 *
 * /api/students/me/employment/proof:
 *   post:
 *     tags: [Students]
 *     summary: Upload employment proof
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               proof_type:
 *                 type: string
 *                 enum: [offer_letter, business_proof]
 *     responses:
 *       201:
 *         description: Employment updated with the proof URL
 *
 * /api/students/me/resumes:
 *   get:
 *     tags: [Students]
 *     summary: List resumes
 *     responses:
 *       200:
 *         description: Resumes list
 *   post:
 *     tags: [Students]
 *     summary: Upload resume (multipart file)
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
 *         description: Resume uploaded
 *
 * /api/students/me/resumes/{resumeId}/default:
 *   put:
 *     tags: [Students]
 *     summary: Set resume as default
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Default updated
 *
 * /api/students/me/resumes/{resumeId}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete resume
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/students/me/policy-acceptance:
 *   post:
 *     tags: [Students]
 *     summary: Accept placement policy (permanent, one-time)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [policy_read, rules_accepted, profile_sharing_consent, resume_sharing_consent, data_storage_consent, communication_consent]
 *             properties:
 *               policy_read: { type: boolean, enum: [true] }
 *               rules_accepted: { type: boolean, enum: [true] }
 *               profile_sharing_consent: { type: boolean, enum: [true] }
 *               resume_sharing_consent: { type: boolean, enum: [true] }
 *               data_storage_consent: { type: boolean, enum: [true] }
 *               communication_consent: { type: boolean, enum: [true] }
 *     responses:
 *       200:
 *         description: Policy accepted
 *       422:
 *         description: Already accepted (POLICY_ALREADY_ACCEPTED)
 *
 * /api/students/me/interests:
 *   get:
 *     tags: [Students]
 *     summary: Get registered interests
 *     responses:
 *       200:
 *         description: Interests list
 *   post:
 *     tags: [Students]
 *     summary: Register interests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [interest_types]
 *             properties:
 *               interest_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: Active posting type master value
 *     responses:
 *       200:
 *         description: Interests registered
 */
