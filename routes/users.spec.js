const express = require('express');
const request = require('supertest');

const usersRouter = require('./users');

// これはサンプルのテストコードですので、users.js等を変更するときは、削除ないし置き換えてください
// npm testで実行できます
// 参考になる記事：https://typescriptbook.jp/tutorials/vitest

describe('GET /users', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/users', usersRouter);
  });

  test('respond with a resource を返す', async () => {
    const res = await request(app).get('/users');

    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('respond with a resource');
  });
});