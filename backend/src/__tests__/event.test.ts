import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;
let companyId: string;
let studentId: string;

beforeAll(async () => {
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;

  const cRes = await request(app)
    .get('/api/companies?limit=1')
    .set('Authorization', `Bearer ${adminToken}`);
  companyId = cRes.body.data[0].id;

  const student = await prisma.student.findFirst({ where: { user: { email: 'student@silveroak.ac.in' } } });
  studentId = student!.id;
});

afterAll(async () => {
  await prisma.eventStudent.deleteMany({});
  await prisma.eventPanel.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('Events CRUD', () => {
  let eventId: string;
  let panelId: string;

  it('should create an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        company_id: companyId,
        title: 'TCS Campus Drive',
        type: 'campus_drive',
        date: '2025-04-15',
        start_time: '09:00',
        end_time: '17:00',
        venue: 'Main Auditorium',
        reporting_time: '08:30',
        dress_code: 'Formal',
        documents_required: ['Resume', 'ID Card'],
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('TCS Campus Drive');
    expect(res.body.status).toBe('draft');
    eventId = res.body.id;
  });

  it('should list events', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should get event by id', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.company).toBeDefined();
    expect(res.body.panels).toBeDefined();
  });

  it('should update an event', async () => {
    const res = await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ venue: 'Conference Hall B' });

    expect(res.status).toBe(200);
    expect(res.body.venue).toBe('Conference Hall B');
  });

  it('should update event status', async () => {
    const res = await request(app)
      .put(`/api/events/${eventId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  it('should create a panel', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/panels`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        panel_name: 'Panel A',
        room: 'Room 101',
        start_time: '10:00',
        end_time: '12:00',
        recruiters: ['John HR', 'Jane Tech'],
      });

    expect(res.status).toBe(201);
    expect(res.body.panel_name).toBe('Panel A');
    panelId = res.body.id;
  });

  it('should assign students to event', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_ids: [studentId],
        panel_id: panelId,
      });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].status).toBe('assigned');
  });

  it('should mark attendance', async () => {
    const res = await request(app)
      .put(`/api/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        attendance: 'present',
      });

    expect(res.status).toBe(200);
    expect(res.body.attendance).toBe('present');
  });

  it('should reject attendance for unassigned student', async () => {
    const res = await request(app)
      .put(`/api/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: '00000000-0000-0000-0000-000000000000',
        attendance: 'present',
      });

    expect(res.status).toBe(404);
  });

  it('should reject update of completed event', async () => {
    await request(app)
      .put(`/api/events/${eventId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });

    const res = await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ venue: 'New Venue' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EVENT_FINALIZED');
  });

  it('should reject student role', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent event', async () => {
    const res = await request(app)
      .get('/api/events/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
