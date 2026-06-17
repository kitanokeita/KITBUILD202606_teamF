CREATE TABLE IF NOT EXISTS "siriai" (
    "id"    INTEGER NOT NULL,
    "name"  TEXT NOT NULL,
    "age"   INTEGER,
    "MBTI"  TEXT,
    "hobby" TEXT NOT NULL,
    "hair"  INTEGER NOT NULL,
    "eyes"  INTEGER NOT NULL,
    "mouth" INTEGER NOT NULL,
    PRIMARY KEY("id" AUTOINCREMENT)
);
