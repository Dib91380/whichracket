-- CreateTable
CREATE TABLE "Racket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "headSize" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "balance" INTEGER,
    "pattern" TEXT NOT NULL,
    "levelMin" INTEGER NOT NULL,
    "levelMax" INTEGER NOT NULL,
    "playStyle" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StringItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "gauge" REAL NOT NULL,
    "comfort" INTEGER NOT NULL,
    "spin" INTEGER NOT NULL,
    "control" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecommendationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userLevel" INTEGER NOT NULL,
    "userStyle" TEXT NOT NULL,
    "userBudget" INTEGER,
    "resultJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
