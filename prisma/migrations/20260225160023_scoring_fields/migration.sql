/*
  Warnings:

  - You are about to drop the `RecommendationLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `playStyle` on the `Racket` table. All the data in the column will be lost.
  - Added the required column `comfort` to the `Racket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `control` to the `Racket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `power` to the `Racket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `spin` to the `Racket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durability` to the `StringItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `power` to the `StringItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RecommendationLog";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Racket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "headSize" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "balance" INTEGER,
    "pattern" TEXT NOT NULL,
    "power" INTEGER NOT NULL,
    "spin" INTEGER NOT NULL,
    "control" INTEGER NOT NULL,
    "comfort" INTEGER NOT NULL,
    "levelMin" INTEGER NOT NULL,
    "levelMax" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Racket" ("balance", "brand", "createdAt", "headSize", "id", "levelMax", "levelMin", "model", "pattern", "weight") SELECT "balance", "brand", "createdAt", "headSize", "id", "levelMax", "levelMin", "model", "pattern", "weight" FROM "Racket";
DROP TABLE "Racket";
ALTER TABLE "new_Racket" RENAME TO "Racket";
CREATE TABLE "new_StringItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "gauge" REAL NOT NULL,
    "power" INTEGER NOT NULL,
    "spin" INTEGER NOT NULL,
    "control" INTEGER NOT NULL,
    "comfort" INTEGER NOT NULL,
    "durability" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_StringItem" ("brand", "comfort", "control", "createdAt", "gauge", "id", "kind", "model", "spin") SELECT "brand", "comfort", "control", "createdAt", "gauge", "id", "kind", "model", "spin" FROM "StringItem";
DROP TABLE "StringItem";
ALTER TABLE "new_StringItem" RENAME TO "StringItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
