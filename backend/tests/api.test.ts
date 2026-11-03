import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('ZEROLOCK End-to-End API Security Integration', () => {
  let userTokenA = '';
  let userIdA = '';
  let userTokenB = '';
  let noteId = '';

  it('registers User A with account password (never sends master password)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Security',
        email: 'alice@vtu.ac.in',
        password: 'AliceAccountPassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@vtu.ac.in');
    expect(res.body.data.token).toBeDefined();

    userTokenA = res.body.data.token;
    userIdA = res.body.data.user.id;
  });

  it('registers User B for tenancy isolation tests', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob Attacker',
        email: 'bob@vtu.ac.in',
        password: 'BobAccountPassword123!',
      });

    expect(res.status).toBe(201);
    userTokenB = res.body.data.token;
  });

  it('stores User A vault envelope (Argon2id salt + wrapped vault key)', async () => {
    const res = await request(app)
      .post('/api/vault/setup')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        salt: 'dGVzdHNhbHRmb3J2dXV1dQ==',
        kdfAlgorithm: 'argon2id',
        kdfParameters: {
          memoryCost: 19456,
          timeCost: 3,
          parallelism: 1,
          hashLength: 32,
        },
        wrappedVaultKey: 'Y2lwaGVydGV4dHdyYXBwZWRrZXk=',
        wrappedVaultKeyIv: 'MTIzNDU2Nzg5MDEy',
        recoveryWrappedVaultKey: 'cmVjb3Zlcnl3cmFwcGVka2V5',
        recoveryIv: 'MTIzNDU2Nzg5MDEy',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vaultVersion).toBe(1);
  });

  it('creates an encrypted note for User A (zero plaintext fields)', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        encryptedContent: 'ZW5jcnlwdGVkX2JvZHlfY2lwaGVydGV4dA==',
        contentIv: 'MTIzNDU2Nzg5MDEy',
        encryptedDek: 'd3JhcHBlZF9ub3RlX2Rlaw==',
        dekIv: 'MTIzNDU2Nzg5MDEy',
        encryptedMetadata: 'ZW5jcnlwdGVkX3RpdGxlX2FuZF90YWdz',
        metadataIv: 'MTIzNDU2Nzg5MDEy',
        isPinned: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.encryptedContent).toBe('ZW5jcnlwdGVkX2JvZHlfY2lwaGVydGV4dA==');
    expect(res.body.data.isPinned).toBe(true);
    expect(res.body.data.version).toBe(1);

    // Verify backend response contains ZERO plaintext title or content fields
    expect((res.body.data as any).title).toBeUndefined();
    expect((res.body.data as any).content).toBeUndefined();

    noteId = res.body.data.id;
  });

  it('rejects User B from accessing User A note (Cross-User / IDOR Protection)', async () => {
    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${userTokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('allows User A to fetch their encrypted note', async () => {
    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(noteId);
  });

  it('rotates User A vault key without affecting note ciphertexts', async () => {
    const res = await request(app)
      .put('/api/vault/wrapped-key')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        salt: 'bmV3cmFuZG9tc2FsdDEyMw==',
        kdfAlgorithm: 'argon2id',
        kdfParameters: {
          memoryCost: 19456,
          timeCost: 3,
          parallelism: 1,
          hashLength: 32,
        },
        wrappedVaultKey: 'bmV3X3dyYXBwZWRfdmF1bHRfa2V5',
        wrappedVaultKeyIv: 'bmV3X2l2XzEyMzQ1Ng==',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.vaultVersion).toBe(2);

    // Verify existing note still exists and remains untouched
    const noteRes = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(noteRes.status).toBe(200);
    expect(noteRes.body.data.encryptedContent).toBe('ZW5jcnlwdGVkX2JvZHlfY2lwaGVydGV4dA==');
  });
});
