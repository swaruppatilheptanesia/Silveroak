const request = require('supertest');
const app = require('./dist/app').default;

(async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  console.log('login status', login.status);
  const token = login.body.token;

  const masters = await request(app)
    .get('/api/admin/masters?category=posting_type')
    .set('Authorization', 'Bearer ' + token);
  console.log('masters status', masters.status);
  console.log(JSON.stringify(masters.body, null, 2).slice(0, 1200));

  const items = masters.body.data ?? masters.body;
  const postingTypeId = items[0]?.id;
  console.log('postingTypeId', postingTypeId);

  const save = await request(app)
    .put('/api/admin/masters/noc-templates/' + postingTypeId)
    .set('Authorization', 'Bearer ' + token)
    .send({ name: 'NOC Template - Test', subject: 'Test Subject', body_html: '<p>Test body</p>' });
  console.log('save status', save.status);
  console.log(JSON.stringify(save.body, null, 2).slice(0, 1600));
})();
