-- 1. ユーザー情報を保存するテーブル
CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER NOT NULL,
    "username" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    PRIMARY KEY("id" AUTOINCREMENT)
);

-- 2. siriaiテーブル（user_idと外部キーを追加して作り直し）
CREATE TABLE IF NOT EXISTS "siriai" (
    "id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "relation" TEXT NOT NULL,
    "MBTI" TEXT,
    "hobby" TEXT NOT NULL,
    "hair" INTEGER NOT NULL,
    "eyes" INTEGER NOT NULL,
    "mouth" INTEGER NOT NULL,
    "favorite" INTEGER DEFAULT 0,
    PRIMARY KEY("id" AUTOINCREMENT),
    FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);