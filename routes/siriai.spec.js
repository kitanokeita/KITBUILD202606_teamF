const express = require('express');
const request = require('supertest');
const Module = require('module');

// vi.mock は CJS + ネイティブモジュール(sqlite3)を傍受できないため、
// Node.js の Module._load を直接パッチして siriai.js のロード前にモックを注入する
const mockDbAll = vi.fn();
const mockDbGet = vi.fn();
const mockDbRun = vi.fn();
const mockDbInstance = { all: mockDbAll, get: mockDbGet, run: mockDbRun };

const _originalLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === 'sqlite3') {
    return {
      Database: class {
        constructor() { return mockDbInstance; }
      }
    };
  }
  return _originalLoad.apply(this, arguments);
};

const siriaiRouter = require('./siriai');
Module._load = _originalLoad; // 他のモジュールへの影響を避けるため復元

// res.render をモックして JSON を返すミドルウェア付きの Express アプリを生成する
function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use((req, res, next) => {
    res.render = (view, data) => res.json({ view, data });
    next();
  });
  app.use('/siriai', siriaiRouter);
  return app;
}

// --- GET /siriai/new ---
describe('GET /siriai/new', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  test('200を返し、空の初期データで siriai/new をレンダリングする', async () => {
    const res = await request(app).get('/siriai/new');
    expect(res.statusCode).toBe(200);
    expect(res.body.view).toBe('siriai/new');
    expect(res.body.data.name).toBe('');
    expect(res.body.data.age).toBe('');
    expect(res.body.data.relation).toBe('');
    expect(res.body.data.hobby).toBe('');
    expect(res.body.data.errorMessage).toBe('');
  });
});

// --- POST /siriai/new ---
describe('POST /siriai/new', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  test('全フィールド入力済みの場合、siriai/mii をレンダリングする', async () => {
    const res = await request(app)
      .post('/siriai/new')
      .send('name=太郎&age=20&relation=友人&hobby=読書&MBTI=INTJ');
    expect(res.statusCode).toBe(200);
    expect(res.body.view).toBe('siriai/mii');
    expect(res.body.data.name).toBe('太郎');
    expect(res.body.data.age).toBe('20');
    expect(res.body.data.MBTI).toBe('INTJ');
  });

  test('名前が空の場合、エラーメッセージに「名前」を含めて siriai/new を再レンダリングする', async () => {
    const res = await request(app)
      .post('/siriai/new')
      .send('name=&age=20&relation=友人&hobby=読書&MBTI=INTJ');
    expect(res.statusCode).toBe(200);
    expect(res.body.view).toBe('siriai/new');
    expect(res.body.data.errorMessage).toContain('名前');
  });

  test('複数フィールドが空の場合、全未入力フィールドをエラーメッセージに含む', async () => {
    const res = await request(app)
      .post('/siriai/new')
      .send('name=&age=&relation=&hobby=&MBTI=');
    expect(res.statusCode).toBe(200);
    expect(res.body.view).toBe('siriai/new');
    expect(res.body.data.errorMessage).toContain('名前');
    expect(res.body.data.errorMessage).toContain('年齢');
    expect(res.body.data.errorMessage).toContain('関係');
    expect(res.body.data.errorMessage).toContain('趣味');
    expect(res.body.data.errorMessage).toContain('MBTI');
  });
});

// --- GET /siriai/itiran ---
describe('GET /siriai/itiran', () => {
  let app;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  test('DBから一覧を取得して siriai/itiran をレンダリングする', async () => {
    const mockRows = [
      { id: 1, name: '太郎', age: 20, relation: '友人', hobby: '読書', MBTI: 'INTJ', favorite: 1 },
      { id: 2, name: '花子', age: 22, relation: '同僚', hobby: '映画', MBTI: 'ENFP', favorite: 0 },
    ];
    mockDbAll.mockImplementation((sql, params, cb) => cb(null, mockRows));

    const res = await request(app).get('/siriai/itiran');
    expect(res.statusCode).toBe(200);
    expect(res.body.view).toBe('siriai/itiran');
    expect(res.body.data.rows).toHaveLength(2);
    expect(res.body.data.rows[0].name).toBe('太郎');
  });

  test('DBエラーの場合、500を返す', async () => {
    mockDbAll.mockImplementation((sql, params, cb) => cb(new Error('DB error')));

    const res = await request(app).get('/siriai/itiran');
    expect(res.statusCode).toBe(500);
  });
});

// --- GET /siriai/ ---
describe('GET /siriai/', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  test('ルート / にリダイレクトする', async () => {
    const res = await request(app).get('/siriai/');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});

// --- POST /siriai/mii ---
describe('POST /siriai/mii', () => {
  let app;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  test('DBに知り合いを保存して / にリダイレクトする', async () => {
    mockDbRun.mockImplementation((sql, params, cb) => cb.call({ lastID: 1 }, null));

    const res = await request(app)
      .post('/siriai/mii')
      .send('name=太郎&age=20&relation=友人&MBTI=INTJ&hobby=読書&hair=1&eyes=2&mouth=3');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(mockDbRun).toHaveBeenCalledOnce();
  });

  test('DBエラーの場合、500を返す', async () => {
    mockDbRun.mockImplementation((sql, params, cb) => cb(new Error('DB error')));

    const res = await request(app)
      .post('/siriai/mii')
      .send('name=太郎&age=20&relation=友人&MBTI=INTJ&hobby=読書&hair=1&eyes=2&mouth=3');
    expect(res.statusCode).toBe(500);
  });
});

// --- POST /siriai/ai ---
describe('POST /siriai/ai', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  test('入力データを siriai/ai にレンダリングする', async () => {
    const res = await request(app)
      .post('/siriai/ai')
      .send('name=太郎&age=20&relation=友人&MBTI=INTJ&hobby=読書');
    expect(res.statusCode).toBe(200);
    expect(res.body.view).toBe('siriai/ai');
    expect(res.body.data.name).toBe('太郎');
    expect(res.body.data.age).toBe('20');
    expect(res.body.data.relation).toBe('友人');
    expect(res.body.data.MBTI).toBe('INTJ');
    expect(res.body.data.hobby).toBe('読書');
  });
});

// --- GET /siriai/delete ---
describe('GET /siriai/delete', () => {
  let app;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  test('指定 id を削除して /siriai/itiran にリダイレクトする', async () => {
    mockDbRun.mockImplementation((sql, params, cb) => cb(null));

    const res = await request(app).get('/siriai/delete?id=1');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/siriai/itiran');
    expect(mockDbRun).toHaveBeenCalledWith(
      'DELETE FROM siriai WHERE id = ?',
      ['1'],
      expect.any(Function)
    );
  });

  test('DBエラーの場合、500を返す', async () => {
    mockDbRun.mockImplementation((sql, params, cb) => cb(new Error('DB error')));

    const res = await request(app).get('/siriai/delete?id=1');
    expect(res.statusCode).toBe(500);
  });
});

// --- GET /siriai/edit ---
describe('GET /siriai/edit', () => {
  let app;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  test('指定 id の知り合いを取得して siriai/edit をレンダリングする', async () => {
    const mockRow = { id: 1, name: '太郎', age: 20, relation: '友人', hobby: '読書', MBTI: 'INTJ' };
    mockDbGet.mockImplementation((sql, params, cb) => cb(null, mockRow));

    const res = await request(app).get('/siriai/edit?id=1');
    expect(res.statusCode).toBe(200);
    expect(res.body.view).toBe('siriai/edit');
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.name).toBe('太郎');
    expect(res.body.data.relation).toBe('友人');
  });

  test('DBエラーの場合、500を返す', async () => {
    mockDbGet.mockImplementation((sql, params, cb) => cb(new Error('DB error')));

    const res = await request(app).get('/siriai/edit?id=1');
    expect(res.statusCode).toBe(500);
  });
});

// --- POST /siriai/edit ---
describe('POST /siriai/edit', () => {
  let app;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  test('指定 id の知り合いを更新して /siriai/itiran にリダイレクトする', async () => {
    mockDbRun.mockImplementation((sql, params, cb) => cb(null));

    const res = await request(app)
      .post('/siriai/edit')
      .send('id=1&name=太郎&age=21&relation=友人&MBTI=INTJ&hobby=映画');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/siriai/itiran');
    expect(mockDbRun).toHaveBeenCalledOnce();
  });

  test('DBエラーの場合、500を返す', async () => {
    mockDbRun.mockImplementation((sql, params, cb) => cb(new Error('DB error')));

    const res = await request(app)
      .post('/siriai/edit')
      .send('id=1&name=太郎&age=21&relation=友人&MBTI=INTJ&hobby=映画');
    expect(res.statusCode).toBe(500);
  });
});

// --- GET /siriai/favorite ---
describe('GET /siriai/favorite', () => {
  let app;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  test('favorite=0 の場合、1 にトグルして /siriai/itiran にリダイレクトする', async () => {
    mockDbGet.mockImplementation((sql, params, cb) => cb(null, { favorite: 0 }));
    mockDbRun.mockImplementation((sql, params, cb) => cb(null));

    const res = await request(app).get('/siriai/favorite?id=1');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/siriai/itiran');
    expect(mockDbRun).toHaveBeenCalledWith(
      'UPDATE siriai SET favorite = ? WHERE id = ?',
      [1, '1'],
      expect.any(Function)
    );
  });

  test('favorite=1 の場合、0 にトグルして /siriai/itiran にリダイレクトする', async () => {
    mockDbGet.mockImplementation((sql, params, cb) => cb(null, { favorite: 1 }));
    mockDbRun.mockImplementation((sql, params, cb) => cb(null));

    const res = await request(app).get('/siriai/favorite?id=1');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/siriai/itiran');
    expect(mockDbRun).toHaveBeenCalledWith(
      'UPDATE siriai SET favorite = ? WHERE id = ?',
      [0, '1'],
      expect.any(Function)
    );
  });
});
