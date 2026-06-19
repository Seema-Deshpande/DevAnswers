import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import '../setup.js';
import app from '../../src/app.js';
import Question from '../../src/models/Question.js';
import User from '../../src/models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let userA, tokenA, userB, tokenB;

async function registerAndLogin(suffix) {
  const email = `bookmark-${suffix}-${Date.now()}@example.com`;
  const password = 'password123';
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ name: `BM ${suffix}`, email, password, isAdmin: false });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return { user: userRes.body.data, token: loginRes.body.data.token };
}

async function createQuestion(authorId, title = 'Bookmark me') {
  const q = new Question({ title, description: 'desc', tags: [], author: authorId });
  await q.save();
  return q;
}

beforeAll(async () => {
  ({ user: userA, token: tokenA } = await registerAndLogin('a'));
  ({ user: userB, token: tokenB } = await registerAndLogin('b'));
});

describe('Bookmarks API', () => {
  beforeEach(async () => {
    await Question.deleteMany({});
    await User.updateMany({}, { $set: { bookmarks: [] } });
  });

  it('POST /api/questions/:id/bookmark -> saves a question (200, bookmarked:true) and lists it in /saved', async () => {
    const q = await createQuestion(userA._id);

    const res = await request(app)
      .post(`/api/questions/${q._id}/bookmark`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ questionId: String(q._id), bookmarked: true });

    const saved = await request(app)
      .get('/api/questions/saved')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(saved.status).toBe(200);
    expect(saved.body.data).toHaveLength(1);
    expect(saved.body.data[0]._id).toBe(String(q._id));
    expect(saved.body.data[0].author).toHaveProperty('name');
    expect(saved.body.data[0]).toHaveProperty('answerCount');
  });

  it('requires authentication (401 without a token)', async () => {
    const q = await createQuestion(userA._id);
    const res = await request(app).post(`/api/questions/${q._id}/bookmark`);
    expect(res.status).toBe(401);

    const saved = await request(app).get('/api/questions/saved');
    expect(saved.status).toBe(401);
  });

  it('saving the same question twice is idempotent (no duplicates)', async () => {
    const q = await createQuestion(userA._id);
    await request(app).post(`/api/questions/${q._id}/bookmark`).set('Authorization', `Bearer ${tokenA}`);
    await request(app).post(`/api/questions/${q._id}/bookmark`).set('Authorization', `Bearer ${tokenA}`);

    const saved = await request(app).get('/api/questions/saved').set('Authorization', `Bearer ${tokenA}`);
    expect(saved.body.data).toHaveLength(1);
  });

  it('DELETE /api/questions/:id/bookmark -> unsaves (idempotent) and removes from /saved', async () => {
    const q = await createQuestion(userA._id);
    await request(app).post(`/api/questions/${q._id}/bookmark`).set('Authorization', `Bearer ${tokenA}`);

    const del = await request(app)
      .delete(`/api/questions/${q._id}/bookmark`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(200);
    expect(del.body.data).toEqual({ questionId: String(q._id), bookmarked: false });

    // unsave again -> still 200 (idempotent)
    const del2 = await request(app).delete(`/api/questions/${q._id}/bookmark`).set('Authorization', `Bearer ${tokenA}`);
    expect(del2.status).toBe(200);

    const saved = await request(app).get('/api/questions/saved').set('Authorization', `Bearer ${tokenA}`);
    expect(saved.body.data).toHaveLength(0);
  });

  it('returns 404 for a malformed or non-existent question id (never 500)', async () => {
    const bad = await request(app).post('/api/questions/not-an-id/bookmark').set('Authorization', `Bearer ${tokenA}`);
    expect(bad.status).toBe(404);

    const missing = await request(app)
      .post(`/api/questions/${new mongoose.Types.ObjectId()}/bookmark`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(missing.status).toBe(404);
  });

  it('saved sets are per-user (one user never sees another user\'s saves)', async () => {
    const q = await createQuestion(userA._id);
    await request(app).post(`/api/questions/${q._id}/bookmark`).set('Authorization', `Bearer ${tokenA}`);

    const savedB = await request(app).get('/api/questions/saved').set('Authorization', `Bearer ${tokenB}`);
    expect(savedB.status).toBe(200);
    expect(savedB.body.data).toHaveLength(0);
  });
});
