import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import '../setup.js';
import app from '../../src/app.js';
import Question from '../../src/models/Question.js';
import Answer from '../../src/models/Answer.js';
import dotenv from 'dotenv';
dotenv.config();

let author, authorToken, other, otherToken;

async function registerAndLogin(suffix) {
  const email = `edit-${suffix}-${Date.now()}@example.com`;
  const password = 'password123';
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ name: `Edit ${suffix}`, email, password, isAdmin: false });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return { user: userRes.body.data, token: loginRes.body.data.token };
}

async function createQuestion(authorId) {
  const q = new Question({ title: 'Original title', description: 'Original body', tags: [], author: authorId });
  await q.save();
  return q;
}

beforeAll(async () => {
  ({ user: author, token: authorToken } = await registerAndLogin('author'));
  ({ user: other, token: otherToken } = await registerAndLogin('other'));
});

describe('Edit questions & answers', () => {
  beforeEach(async () => {
    await Question.deleteMany({});
    await Answer.deleteMany({});
  });

  it('PUT /api/questions/:id by the author sets isEdited and persists', async () => {
    const q = await createQuestion(author._id);
    expect(q.isEdited).toBe(false);

    const res = await request(app)
      .put(`/api/questions/${q._id}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'New title', description: 'New body', tags: 'js, node' });

    expect(res.status).toBe(200);
    expect(res.body.data.isEdited).toBe(true);
    expect(res.body.data.title).toBe('New title');

    const fetched = await request(app).get(`/api/questions/${q._id}`);
    expect(fetched.body.data.isEdited).toBe(true);
    expect(fetched.body.data.title).toBe('New title');
  });

  it('rejects an empty title/description with 400', async () => {
    const q = await createQuestion(author._id);
    const res = await request(app)
      .put(`/api/questions/${q._id}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: '   ', description: 'still here', tags: 'js' });
    expect(res.status).toBe(400);
  });

  it('rejects an edit by a non-author with 403', async () => {
    const q = await createQuestion(author._id);
    const res = await request(app)
      .put(`/api/questions/${q._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijack', description: 'nope', tags: 'js' });
    expect(res.status).toBe(403);
  });

  it('voting a question does NOT set isEdited', async () => {
    const q = await createQuestion(author._id);
    // a different user upvotes (cannot vote own post in the UI, but the API allows it;
    // either way the flag must stay false)
    await request(app)
      .post(`/api/questions/${q._id}/upvote`)
      .set('Authorization', `Bearer ${otherToken}`);

    const fetched = await request(app).get(`/api/questions/${q._id}`);
    expect(fetched.body.data.isEdited).toBe(false);
  });

  it('PUT /api/answers/:id by the author sets isEdited; empty text -> 400', async () => {
    const q = await createQuestion(author._id);
    const created = await request(app)
      .post(`/api/questions/${q._id}/answers`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ answerText: 'first answer' });
    const answerId = created.body.data._id;
    expect(created.body.data.isEdited).toBe(false);

    const ok = await request(app)
      .put(`/api/answers/${answerId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ answerText: 'edited answer' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.isEdited).toBe(true);
    expect(ok.body.data.answerText).toBe('edited answer');

    const blank = await request(app)
      .put(`/api/answers/${answerId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ answerText: '   ' });
    expect(blank.status).toBe(400);
  });
});
