const Module = require('module');
const express = require('express');
const request = require('supertest');

const mocks = {
  dbRun: vi.fn(),
  hash: vi.fn(),
};

const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'bcrypt') {
    return {
      hash: mocks.hash,
    };
  }

  if (request === 'sqlite3') {
    return {
      verbose: () => ({
        Database: vi.fn(function() {
          this.run = mocks.dbRun;
        }),
      }),
    };
  }

  if (request === 'passport') {
    return {
      authenticate: vi.fn(() => (req, res, next) => next()),
    };
  }

  return originalLoad.apply(this, arguments);
};

const indexRouter = require('./index');
let consoleErrorSpy;

afterAll(() => {
  Module._load = originalLoad;
});describe('POST /register', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use('/', indexRouter);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('ユーザー名とハッシュ化したパスワードを保存してログイン画面へ移動する', async () => {
    mocks.hash.mockResolvedValue('hashed-password');
    mocks.dbRun.mockImplementation((sql, params, callback) => {
      callback(null);
    });

    const res = await request(app)
      .post('/register')
      .type('form')
      .send({ username: 'taro', password: 'secret' });

    expect(mocks.hash).toHaveBeenCalledWith('secret', 10);
    expect(mocks.dbRun).toHaveBeenCalledWith(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      ['taro', 'hashed-password'],
      expect.any(Function),
    );
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('データベース保存に失敗したら登録画面へ戻る', async () => {
    mocks.hash.mockResolvedValue('hashed-password');
    mocks.dbRun.mockImplementation((sql, params, callback) => {
      callback(new Error('insert failed'));
    });

    const res = await request(app)
      .post('/register')
      .type('form')
      .send({ username: 'taro', password: 'secret' });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/register');
  });

  test('パスワードのハッシュ化に失敗したら登録画面へ戻る', async () => {
    mocks.hash.mockRejectedValue(new Error('hash failed'));

    const res = await request(app)
      .post('/register')
      .type('form')
      .send({ username: 'taro', password: 'secret' });

    expect(mocks.dbRun).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/register');
  });
});