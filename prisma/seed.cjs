require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const racketsPath = path.join(process.cwd(), "data", "rackets.json");
  const stringsPath = path.join(process.cwd(), "data", "strings.json");

  const rackets = JSON.parse(fs.readFileSync(racketsPath, "utf-8"));
  const strings = JSON.parse(fs.readFileSync(stringsPath, "utf-8"));

  await prisma.stringItem.deleteMany();
  await prisma.racket.deleteMany();

  await prisma.racket.createMany({ data: rackets });
  await prisma.stringItem.createMany({ data: strings });

  console.log(`✅ ${rackets.length} raquettes importées`);
  console.log(`✅ ${strings.length} cordages importés`);
}

main()
  .catch((e) => {
    console.error("❌ Seed erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });