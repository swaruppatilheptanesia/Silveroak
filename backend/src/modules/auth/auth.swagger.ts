/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication & session management
 *
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email & password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tpoadmin@silveroakuni.ac.in
 *               password:
 *                 type: string
 *                 example: Password@123
 *               tenant_slug:
 *                 type: string
 *                 example: silveroak
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     name: { type: string }
 *                     role: { type: string }
 *       401:
 *         description: Invalid credentials
 *
 * /api/auth/student-signup/request-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Start student self-signup with enrollment number
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enrollment_no]
 *             properties:
 *               enrollment_no:
 *                 type: string
 *                 example: "2204030100554"
 *               tenant_slug:
 *                 type: string
 *                 example: silver-oak-university
 *     responses:
 *       200:
 *         description: OTP generated and signup token returned
 *
 * /api/auth/student-signup/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify student self-signup OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signup_token, otp]
 *             properties:
 *               signup_token:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "000000"
 *     responses:
 *       200:
 *         description: OTP verified and verified token returned
 *
 * /api/auth/student-signup/complete:
 *   post:
 *     tags: [Auth]
 *     summary: Complete student self-signup and create account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verified_token, password, confirm_password]
 *             properties:
 *               verified_token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               confirm_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: Student account created and login tokens returned
 *
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Start password reset for an existing account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               tenant_slug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset started and reset token returned
 *
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Complete password reset with reset token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, new_password, confirm_new_password]
 *             properties:
 *               token:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *               confirm_new_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset completed
 *
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token pair
 *       401:
 *         description: Invalid or revoked refresh token
 *
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 *
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: Current user info
 */
