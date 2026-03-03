import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

// ---------------------------
// Helpers
// ---------------------------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round05(x: number) {
  return Math.round(x * 2) / 2;
}

/**
 * Convertit un classement FFT en score 1..10 (approx).
 */
function fftToLevelScore(rank: string): number {
  const map: Record<string, number> = {
    "NC": 1,
    "40": 2,
    "30/5": 3,
    "30/4": 3.5,
    "30/3": 4,
    "30/2": 4.5,
    "30/1": 5,
    "30": 5.5,
    "15/5": 6,
    "15/4": 6.3,
    "15/3": 6.6,
    "15/2": 7,
    "15/1": 7.4,
    "15": 7.8,
    "5/6": 8.2,
    "4/6": 8.5,
    "3/6": 8.8,
    "2/6": 9.1,
    "1/6": 9.3,
    "0": 9.5,
    "-2/6": 9.7,
    "-4/6": 9.85,
    "-15": 10,
  };

  return map[rank] ?? 5.5;
}

function weightProximityScore(targetG: number, racketG: number) {
  const diff = Math.abs(targetG - racketG);
  const score = 1 - diff / 30; // diff 30 => 0
  return clamp(score, 0, 1);
}

function headSizeScore(wanted: number, head: number) {
  const diff = Math.abs(wanted - head);
  if (diff === 0) return 1;
  if (diff <= 2) return 0.85;
  if (diff <= 4) return 0.65;
  return 0.35;
}

/**
 * Tension reco
 * - base autour de tensionKg (si donnée), sinon 23
 * - goal contrôle => un peu plus haut
 * - power/confort => un peu plus bas
 * - armPain => baisse
 * - poly => un peu plus bas souvent
 */
function recommendedTensionKg(input: any) {
  const goal = String(input?.goal ?? "spin");
  const armPain = Boolean(input?.armPain);
  const stringType = String(input?.stringType ?? "dontknow");
  const ref = Number(input?.tensionKg ?? 23);

  let t = 23;
  if (!Number.isNaN(ref) && ref >= 16 && ref <= 30) t = ref;

  if (goal === "control") t += 0.8;
  if (goal === "power") t -= 0.6;
  if (goal === "comfort") t -= 0.8;

  if (armPain) t -= 1.0;

  if (stringType === "poly") t -= 0.3;
  if (stringType === "multi") t += 0.2;

  t = clamp(round05(t), 16, 30);
  return t;
}

// ---------------------------
// RACKET scoring weights
// ---------------------------
function racketWeights(input: any) {
  const goal = String(input?.goal ?? "spin");
  const racketFeel = String(input?.racketFeel ?? "mix");
  const gameType = String(input?.gameType ?? "complet");
  const armPain = Boolean(input?.armPain);

  let wPower = 1;
  let wSpin = 1;
  let wControl = 1;
  let wComfort = 1;

  if (goal === "spin") wSpin += 1.4;
  if (goal === "control") wControl += 1.4;
  if (goal === "power") wPower += 1.4;
  if (goal === "comfort") wComfort += 1.6;

  if (racketFeel === "spin") wSpin += 0.9;
  if (racketFeel === "power") wPower += 0.9;
  if (racketFeel === "comfort") wComfort += 1.1;
  if (racketFeel === "mix") {
    wPower += 0.3; wSpin += 0.3; wControl += 0.3; wComfort += 0.3;
  }

  if (gameType === "defense") { wControl += 0.6; wComfort += 0.5; }
  if (gameType === "attaque") { wPower += 0.6; wSpin += 0.4; }
  if (gameType === "servevolley") { wPower += 0.7; wControl += 0.5; }
  if (gameType === "complet") { wPower += 0.3; wSpin += 0.3; wControl += 0.3; wComfort += 0.3; }

  // bras : on garde juste armPain
  if (armPain) wComfort += 1.2;

  const sum = wPower + wSpin + wControl + wComfort;
  return {
    power: wPower / sum,
    spin: wSpin / sum,
    control: wControl / sum,
    comfort: wComfort / sum,
  };
}

// ---------------------------
// STRING scoring weights
// ---------------------------
function stringWeights(input: any) {
  const priority = String(input?.stringPriority ?? "spin");
  const armPain = Boolean(input?.armPain);
  const breaksOften = String(input?.breaksOften ?? "dontknow");
  const stringType = String(input?.stringType ?? "dontknow");

  let wPower = 1;
  let wSpin = 1;
  let wControl = 1;
  let wComfort = 1;
  let wDur = 1;

  if (priority === "spin") wSpin += 1.4;
  if (priority === "control") wControl += 1.4;
  if (priority === "power") wPower += 1.4;
  if (priority === "comfort") wComfort += 1.6;

  if (armPain) wComfort += 1.2;
  if (breaksOften === "yes") wDur += 1.0;

  // léger biais si le user impose un type (sans comfortNeed)
  if (stringType === "poly") { wSpin += 0.2; wControl += 0.2; wDur += 0.2; wComfort -= 0.2; }
  if (stringType === "multi") { wComfort += 0.5; wPower += 0.3; wDur -= 0.2; }
  if (stringType === "hybrid") { wComfort += 0.2; wControl += 0.2; wDur += 0.2; }

  wComfort = Math.max(0.1, wComfort);

  const sum = wPower + wSpin + wControl + wComfort + wDur;
  return {
    power: wPower / sum,
    spin: wSpin / sum,
    control: wControl / sum,
    comfort: wComfort / sum,
    durability: wDur / sum,
  };
}

// ---------------------------
// Route
// ---------------------------
export async function POST(req: Request) {
  try {
    const input = await req.json();
    
    

    const levelScore = fftToLevelScore(String(input?.fftRank ?? "30"));
    const rw = racketWeights(input);
    const sw = stringWeights(input);

    // ✅ poids DB = uniquement la préférence (plus de "profil physique")
    const targetWeightPref = clamp(Number(input?.targetWeight ?? 300), 270, 330);
    const targetWeightForDb = clamp(Math.round(targetWeightPref / 5) * 5, 270, 320);

    const [rackets, strings] = await Promise.all([
      prisma.racket.findMany(),
      prisma.stringItem.findMany(),
    ]);

    const racketScored = rackets.map((r) => {
      const within = levelScore >= r.levelMin && levelScore <= r.levelMax;
      const levelPenalty = within
        ? 0
        : Math.min(
            2.5,
            Math.abs(levelScore - clamp(levelScore, r.levelMin, r.levelMax)) * 0.9
          );

      const perf =
        r.power * rw.power +
        r.spin * rw.spin +
        r.control * rw.control +
        r.comfort * rw.comfort;

      const wScore = weightProximityScore(targetWeightForDb, r.weight);
      const hScore = headSizeScore(Number(input?.headSize ?? 100), r.headSize);

      // bras : on garde armPain seulement
      const firstRacket = Boolean(input?.firstRacket);
      const armPain = Boolean(input?.armPain);
      const comfortBonus = armPain ? (r.comfort >= 7 ? 0.6 : -0.6) : 0;
      
      let beginnerAdj = 0;

      if (firstRacket) {
        if (r.headSize >= 100) beginnerAdj += 0.6;
        if (r.comfort >= 7) beginnerAdj += 0.6;
        if (r.control >= 9) beginnerAdj -= 0.4;
        if (r.weight >= 305) beginnerAdj -= 0.4;
        if (r.headSize <= 98 && r.control >= 9) beginnerAdj -= 0.8;
      }

      const score =
        perf * 1.0 +
        wScore * 3.2 +
        hScore * 1.6 +
        comfortBonus +
        beginnerAdj -
        levelPenalty;

      return { ...r, _score: Number(score.toFixed(2)) };
    });

    const stringScored = strings.map((s) => {
      const perf =
        s.power * sw.power +
        s.spin * sw.spin +
        s.control * sw.control +
        s.comfort * sw.comfort +
        s.durability * sw.durability;

      const armPain = Boolean(input?.armPain);
      const kind = String(s.kind ?? "");
      let painPenalty = 0;
      if (armPain && kind === "poly" && s.comfort <= 5) painPenalty = 1.3;

      const breaksOften = String(input?.breaksOften ?? "dontknow");
      const durBonus = breaksOften === "yes" ? (s.durability >= 7 ? 0.6 : -0.2) : 0;

      const score = perf * 1.0 + durBonus - painPenalty;

      return { ...s, _score: Number(score.toFixed(2)) };
    });

    racketScored.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
    stringScored.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));

    const topRackets = racketScored.slice(0, 10);
    const topStrings = stringScored.slice(0, 10);

    const tension = recommendedTensionKg(input);

    return NextResponse.json({
      rackets: topRackets,
      strings: topStrings,
      recommendedTension: tension,
      computed: {
        levelScore,
        targetWeightForDb,
        racketWeights: rw,
        stringWeights: sw,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}