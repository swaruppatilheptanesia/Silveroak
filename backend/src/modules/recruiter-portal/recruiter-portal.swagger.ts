/**
 * @swagger
 * tags:
 *   - name: RecruiterPortal
 *     description: Recruiter-facing portal with PII protection
 *
 * /api/recruiter-portal/dashboard:
 *   get:
 *     tags: [RecruiterPortal]
 *     summary: Recruiter dashboard (recruiter role, PII filtered)
 *     responses:
 *       200:
 *         description: Dashboard with company postings and application counts
 *
 * /api/recruiter-portal/postings:
 *   get:
 *     tags: [RecruiterPortal]
 *     summary: List postings for recruiter's company
 *     responses:
 *       200:
 *         description: Company postings
 *
 * /api/recruiter-portal/postings/{postingId}/applications:
 *   get:
 *     tags: [RecruiterPortal]
 *     summary: List applications for a posting (PII filtered)
 *     parameters:
 *       - in: path
 *         name: postingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Applications with student info (PII stripped)
 */
