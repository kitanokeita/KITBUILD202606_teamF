CREATE TABLE IF NOT EXISTS "siriai" (
    "id"    INTEGER NOT NULL,
    "name"  TEXT NOT NULL,
    "age"   INTEGER,
    "age"   TEXT,
    "MBTI"  TEXT,
    "hobby" TEXT NOT NULL,
    "hair"  INTEGER NOT NULL,
    "eyes"  INTEGER NOT NULL,
    "mouth" INTEGER NOT NULL,
    "favorite"	INTEGER DEFAULT 0,
    PRIMARY KEY("id" AUTOINCREMENT)
);
