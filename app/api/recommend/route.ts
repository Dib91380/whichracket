import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

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
    NC: 1,
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
 * Tension recommandée
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
  if (stringType === "hybrid") t -= 0.1;

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
  const style = String(input?.style ?? "mix");
  const frequency = String(input?.frequency ?? "3-4");
  const armPain = Boolean(input?.armPain);
  const age = Number(input?.age ?? 25);

  let wPower = 1;
  let wSpin = 1;
  let wControl = 1;
  let wComfort = 1;

  // objectif principal
  if (goal === "spin") wSpin += 1.4;
  if (goal === "control") wControl += 1.4;
  if (goal === "power") wPower += 1.4;
  if (goal === "comfort") wComfort += 1.6;

  // sensations recherchées
  if (racketFeel === "spin") wSpin += 0.9;
  if (racketFeel === "power") wPower += 0.9;
  if (racketFeel === "comfort") wComfort += 1.1;
  if (racketFeel === "mix") {
    wPower += 0.3;
    wSpin += 0.3;
    wControl += 0.3;
    wComfort += 0.3;
  }

  // type de frappe
  if (style === "lift") {
    wSpin += 0.8;
    wPower += 0.2;
  }
  if (style === "flat") {
    wControl += 0.8;
    wPower += 0.2;
  }
  if (style === "mix") {
    wSpin += 0.2;
    wControl += 0.2;
  }

  // type de jeu
  if (gameType === "defense") {
    wControl += 0.6;
    wComfort += 0.5;
  }
  if (gameType === "attaque") {
    wPower += 0.6;
    wSpin += 0.4;
  }
  if (gameType === "servevolley") {
    wPower += 0.7;
    wControl += 0.5;
  }
  if (gameType === "complet") {
    wPower += 0.3;
    wSpin += 0.3;
    wControl += 0.3;
    wComfort += 0.3;
  }

  // fréquence
  if (frequency === "1-2") {
    wComfort += 0.5;
    wControl += 0.2;
  }
  if (frequency === "5+") {
    wSpin += 0.3;
    wControl += 0.3;
  }

  // confort / âge
  if (armPain) wComfort += 1.2;
  if (age >= 40) wComfort += 0.2;

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
  const style = String(input?.style ?? "mix");
  const frequency = String(input?.frequency ?? "3-4");
  const age = Number(input?.age ?? 25);

  let wPower = 1;
  let wSpin = 1;
  let wControl = 1;
  let wComfort = 1;
  let wDur = 1;

  if (priority === "spin") wSpin += 1.4;
  if (priority === "control") wControl += 1.4;
  if (priority === "power") wPower += 1.4;
  if (priority === "comfort") wComfort += 1.6;

  if (style === "lift") wSpin += 0.4;
  if (style === "flat") wControl += 0.4;

  if (armPain) wComfort += 1.2;
  if (age >= 40) wComfort += 0.2;

  if (breaksOften === "yes") wDur += 1.0;

  if (frequency === "1-2") {
    wComfort += 0.4;
  }
  if (frequency === "5+") {
    wDur += 0.4;
    wControl += 0.2;
  }

  if (stringType === "poly") {
    wSpin += 0.2;
    wControl += 0.2;
    wDur += 0.2;
    wComfort -= 0.2;
  }
  if (stringType === "multi") {
    wComfort += 0.5;
    wPower += 0.3;
    wDur -= 0.2;
  }
  if (stringType === "hybrid") {
    wComfort += 0.2;
    wControl += 0.2;
    wDur += 0.2;
  }

  wComfort = Math.max(0.1, wComfort);
  wDur = Math.max(0.1, wDur);

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
// Load JSON data
// ---------------------------
async function loadJson<T>(relPath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), relPath);
  const raw = await fs.readFile(fullPath, "utf-8");
  return JSON.parse(raw) as T;
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

    const targetWeightPref = clamp(Number(input?.targetWeight ?? 300), 270, 330);
    const targetWeightForDb = clamp(Math.round(targetWeightPref / 5) * 5, 270, 320);

    const rackets = await loadJson<any[]>("data/rackets.json");
    const strings = await loadJson<any[]>("data/strings.json");

    const racketScored = rackets.map((r) => {
      const within = levelScore >= r.levelMin && levelScore <= r.levelMax;

      const levelPenalty = within
        ? 0
        : Math.min(
            3,
            Math.abs(levelScore - clamp(levelScore, r.levelMin, r.levelMax)) * 1.2
          );

      const perf =
        r.power * rw.power +
        r.spin * rw.spin +
        r.control * rw.control +
        r.comfort * rw.comfort;

      const wScore = weightProximityScore(targetWeightForDb, r.weight);

      const wantedHead =
        typeof input?.headSize === "number" ? Number(input.headSize) : 100;

      const hScore = headSizeScore(wantedHead, r.headSize);

      const firstRacket = Boolean(input?.firstRacket);
      const armPain = Boolean(input?.armPain);
      const style = String(input?.style ?? "mix");
      const gameType = String(input?.gameType ?? "complet");
      const frequency = String(input?.frequency ?? "3-4");
      const age = Number(input?.age ?? 25);

      const comfortBonus = armPain ? (r.comfort >= 7 ? 0.6 : -0.6) : 0;
      const armPainPenalty = armPain && r.comfort <= 4 ? 0.8 : 0;

      let beginnerAdj = 0;
      if (firstRacket) {
        if (r.headSize >= 100) beginnerAdj += 0.6;
        if (r.comfort >= 7) beginnerAdj += 0.6;
        if (r.control >= 9) beginnerAdj -= 0.4;
        if (r.weight >= 305) beginnerAdj -= 0.4;
        if (r.headSize <= 98 && r.control >= 9) beginnerAdj -= 0.8;
      }

      let profileFit = 0;

      if (gameType === "attaque" && (r.power >= 7 || r.spin >= 7)) profileFit += 0.35;
      if (gameType === "defense" && (r.control >= 7 || r.comfort >= 7)) profileFit += 0.35;
      if (gameType === "servevolley" && (r.power >= 7 || r.control >= 7)) profileFit += 0.35;
      if (gameType === "complet" && r.power >= 6 && r.control >= 6) profileFit += 0.25;

      if (style === "lift" && r.spin >= 7) profileFit += 0.35;
      if (style === "flat" && r.control >= 7) profileFit += 0.35;
      if (style === "mix" && r.power >= 6 && r.control >= 6) profileFit += 0.2;

      if (frequency === "1-2" && r.comfort >= 7) profileFit += 0.2;
      if (frequency === "5+" && (r.spin >= 7 || r.control >= 7)) profileFit += 0.2;

      if (age >= 40 && r.comfort >= 7) profileFit += 0.2;

      let hardPenalty = 0;

      // première raquette : éviter les cadres trop exigeants
      if (firstRacket && r.weight >= 305 && r.headSize <= 98 && r.control >= 9) {
        hardPenalty += 3;
      }

      // douleur au bras : éviter les cadres trop inconfortables
      if (armPain && r.comfort <= 4) {
        hardPenalty += 2;
      }

      // petit niveau : éviter certains cadres trop techniques
      if (levelScore <= 5.5 && r.weight >= 305 && r.control >= 8.5) {
        hardPenalty += 2;
      }

      // demande de tamis tolérant mais cadre précis/exigeant
      if (wantedHead >= 100 && r.headSize <= 98 && firstRacket) {
        hardPenalty += 1.2;
      }

      const score =
        perf * 1.8 +
        profileFit * 1.5 +
        wScore * 2.2 +
        hScore * 1.4 +
        comfortBonus +
        beginnerAdj -
        armPainPenalty -
        levelPenalty -
        hardPenalty;

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
      const breaksOften = String(input?.breaksOften ?? "dontknow");
      const stringType = String(input?.stringType ?? "dontknow");
      const frequency = String(input?.frequency ?? "3-4");
      const kind = String(s.kind ?? "");

      let painPenalty = 0;
      if (armPain && kind === "poly" && s.comfort <= 5) painPenalty = 1.3;

      let durBonus = 0;
      if (breaksOften === "yes") durBonus = s.durability >= 7 ? 0.6 : -0.2;

      let typeBonus = 0;
      if (stringType === "poly" && kind === "poly") typeBonus += 0.3;
      if (stringType === "multi" && kind === "multi") typeBonus += 0.3;
      if (stringType === "hybrid" && kind === "hybrid") typeBonus += 0.3;

      let profileFit = 0;
      if (frequency === "1-2" && s.comfort >= 7) profileFit += 0.25;
      if (frequency === "5+" && s.durability >= 7) profileFit += 0.25;
      if (armPain && s.comfort >= 7) profileFit += 0.4;

      let hardPenalty = 0;

      // douleur au bras : on évite certains polys trop raides
      if (armPain && kind === "poly" && s.comfort <= 4) {
        hardPenalty += 2.2;
      }

      // faible fréquence + poly très inconfortable
      if (frequency === "1-2" && kind === "poly" && s.comfort <= 4) {
        hardPenalty += 1.2;
      }

      // si l'utilisateur veut explicitement du multi, on pénalise les polys raides
      if (stringType === "multi" && kind === "poly" && s.comfort <= 5) {
        hardPenalty += 1.4;
      }

      const score =
        perf * 1.35 +
        profileFit +
        durBonus +
        typeBonus -
        painPenalty -
        hardPenalty;

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
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}