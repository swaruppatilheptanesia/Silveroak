/**
 * @swagger
 * tags:
 *   - name: Events
 *     description: Campus events - panels, student assignment, attendance
 *
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: List events with filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published, ongoing, completed, cancelled] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [campus_drive, ppt, test_assessment, internship_drive, workshop] }
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated events
 *   post:
 *     tags: [Events]
 *     summary: Create event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, title, type, date, start_time, end_time, venue]
 *             properties:
 *               company_id: { type: string, format: uuid }
 *               title: { type: string }
 *               type: { type: string, enum: [campus_drive, ppt, test_assessment, internship_drive, workshop] }
 *               date: { type: string, format: date }
 *               start_time: { type: string }
 *               end_time: { type: string }
 *               venue: { type: string }
 *               dress_code: { type: string }
 *               instructions: { type: string }
 *               documents_required: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Created
 *
 * /api/events/{eventId}:
 *   get:
 *     tags: [Events]
 *     summary: Get event with panels & assigned students
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event detail
 *   put:
 *     tags: [Events]
 *     summary: Update event (not if completed/cancelled)
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *       422:
 *         description: EVENT_FINALIZED
 *
 * /api/events/{eventId}/status:
 *   put:
 *     tags: [Events]
 *     summary: Update event status
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               status: { type: string, enum: [draft, published, ongoing, completed, cancelled] }
 *     responses:
 *       200:
 *         description: Status updated
 *
 * /api/events/{eventId}/panels:
 *   post:
 *     tags: [Events]
 *     summary: Create interview panel
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [panel_name, room]
 *             properties:
 *               panel_name: { type: string }
 *               room: { type: string }
 *               recruiters: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Panel created
 *
 * /api/events/{eventId}/students:
 *   post:
 *     tags: [Events]
 *     summary: Assign students to event (optionally to a panel)
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_ids]
 *             properties:
 *               student_ids: { type: array, items: { type: string, format: uuid } }
 *               panel_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Assignment results
 *
 * /api/events/{eventId}/attendance:
 *   put:
 *     tags: [Events]
 *     summary: Mark student attendance
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student_id, attendance]
 *             properties:
 *               student_id: { type: string, format: uuid }
 *               attendance: { type: string, enum: [present, absent, late] }
 *     responses:
 *       200:
 *         description: Attendance marked
 */
