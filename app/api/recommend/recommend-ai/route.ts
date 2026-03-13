import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Lang = "fr" | "en";

type AiPick = {
  id?: string;
  title: string;
  reasons: string[];
};

type AiOut = {
  rackets: AiPick[];
  strings: AiPick[];
  recommendedTensionKg: number;
  recommendedWeightG: number;
  notes: string[];
};

function clamp05(x: number) {
  return Math.round(x * 2) / 2;
}

function clampInt(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(x)));
}

function safeArray<T = any>(x: any): T[] {
  return Array.isArray(x) ? x : [];
}

function getLang(body: any): Lang {
  return body?.lang === "en" ? "en" : "fr";
}

function fallbackTitleRacket(x: any) {
  const brand = String(x?.brand ?? "").trim();
  const model = String(x?.model ?? "").trim();
  return `${brand} ${model}`.trim() || "Racket";
}

function fallbackTitleString(x: any) {
  const brand = String(x?.brand ?? "").trim();
  const model = String(x?.model ?? "").trim();
  const gauge = x?.gauge ? ` ${x.gauge}` : "";
  return `${brand} ${model}${gauge}`.trim() || "String";
}

function buildFallbackReasonsRacket(x: any, questionnaire: any, lang: Lang) {
  const reasons: string[] = [];

  if (lang === "fr") {
    if (x?.spin >= 7 && questionnaire?.goal === "spin") {
      reasons.push("Bon match avec ta recherche de spin.");
    }
    if (x?.control >= 7 && questionnaire?.goal === "control") {
      reasons.push("Apporte le contrôle que tu recherches.");
    }
    if (x?.power >= 7 && questionnaire?.goal === "power") {
      reasons.push("Aide à générer plus de puissance.");
    }
    if (x?.comfort >= 7 && (questionnaire?.goal === "comfort" || questionnaire?.armPain)) {
      reasons.push("Profil plus confortable pour le bras.");
    }
    if (typeof x?._score === "number") {
      reasons.push("Très bien classée par le moteur de recommandation.");
    }
  } else {
    if (x?.spin >= 7 && questionnaire?.goal === "spin") {
      reasons.push("Good match for your spin-oriented needs.");
    }
    if (x?.control >= 7 && questionnaire?.goal === "control") {
      reasons.push("Provides the control you are looking for.");
    }
    if (x?.power >= 7 && questionnaire?.goal === "power") {
      reasons.push("Helps generate easier power.");
    }
    if (x?.comfort >= 7 && (questionnaire?.goal === "comfort" || questionnaire?.armPain)) {
      reasons.push("More arm-friendly overall profile.");
    }
    if (typeof x?._score === "number") {
      reasons.push("Highly ranked by the recommendation engine.");
    }
  }

  return reasons.slice(0, 3);
}

function buildFallbackReasonsString(x: any, questionnaire: any, lang: Lang) {
  const reasons: string[] = [];

  if (lang === "fr") {
    if (x?.spin >= 7 && questionnaire?.stringPriority === "spin") {
      reasons.push("Bon choix pour favoriser le spin.");
    }
    if (x?.control >= 7 && questionnaire?.stringPriority === "control") {
      reasons.push("Aide à mieux contrôler la balle.");
    }
    if (x?.power >= 7 && questionnaire?.stringPriority === "power") {
      reasons.push("Peut apporter un peu plus de relance.");
    }
    if (x?.comfort >= 7 && (questionnaire?.stringPriority === "comfort" || questionnaire?.armPain)) {
      reasons.push("Option plus confortable pour le bras.");
    }
    if (x?.durability >= 7 && questionnaire?.breaksOften === "yes") {
      reasons.push("Intéressant si tu casses souvent.");
    }
  } else {
    if (x?.spin >= 7 && questionnaire?.stringPriority === "spin") {
      reasons.push("Good option to enhance spin.");
    }
    if (x?.control >= 7 && questionnaire?.stringPriority === "control") {
      reasons.push("Helps improve ball control.");
    }
    if (x?.power >= 7 && questionnaire?.stringPriority === "power") {
      reasons.push("Can provide a bit more easy power.");
    }
    if (x?.comfort >= 7 && (questionnaire?.stringPriority === "comfort" || questionnaire?.armPain)) {
      reasons.push("More comfortable option for the arm.");
    }
    if (x?.durability >= 7 && questionnaire?.breaksOften === "yes") {
      reasons.push("Useful if you break strings often.");
    }
  }

  return reasons.slice(0, 3);
}

function buildFallbackOutput(body: any): AiOut {
  const lang = getLang(body);
  const questionnaire = body?.questionnaire ?? {};
  const rackets = safeArray(body?.rackets).slice(0, 3);
  const strings = safeArray(body?.strings).slice(0, 3);

  return {
    rackets: rackets.map((x: any) => ({
      id: typeof x?.id === "string" ? x.id : undefined,
      title: fallbackTitleRacket(x),
      reasons: buildFallbackReasonsRacket(x, questionnaire, lang),
    })),
    strings: strings.map((x: any) => ({
      id: typeof x?.id === "string" ? x.id : undefined,
      title: fallbackTitleString(x),
      reasons: buildFallbackReasonsString(x, questionnaire, lang),
    })),
    recommendedTensionKg:
      typeof body?.computed?.recommendedTension === "number"
        ? body.computed.recommendedTension
        : typeof questionnaire?.tensionKg === "number"
        ? questionnaire.tensionKg
        : 23,
    recommendedWeightG:
      typeof body?.recommendedWeightG === "number"
        ? body.recommendedWeightG
        : typeof questionnaire?.targetWeight === "number"
        ? questionnaire.targetWeight
        : 300,
    notes:
      lang === "fr"
        ? [
            "Résultat généré depuis la shortlist algorithmique.",
            "L’arbitrage IA n’a pas été utilisé ou a échoué, fallback local appliqué.",
          ]
        : [
            "Result generated from the algorithmic shortlist.",
            "AI arbitration was not used or failed, so a local fallback was applied.",
          ],
  };
}

export async function POST(req: Request) {
  let body: any = null;

  try {
    body = await req.json();
    const lang = getLang(body);

    const { questionnaire, rackets, strings, computed, recommendedWeightG } = body ?? {};

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(buildFallbackOutput(body));
    }

    if (!Array.isArray(rackets) || !Array.isArray(strings)) {
      return NextResponse.json(
        {
          error:
            lang === "fr"
              ? "Payload invalide: rackets/strings doivent être des tableaux."
              : "Invalid payload: rackets/strings must be arrays.",
        },
        { status: 400 }
      );
    }

    const shortlistRackets = rackets.slice(0, 5);
    const shortlistStrings = strings.slice(0, 5);

    const fallbackWeight =
      typeof recommendedWeightG === "number"
        ? recommendedWeightG
        : typeof questionnaire?.targetWeight === "number"
        ? questionnaire.targetWeight
        : 300;

    const fallbackTension =
      typeof computed?.recommendedTension === "number"
        ? computed.recommendedTension
        : typeof questionnaire?.tensionKg === "number"
        ? questionnaire.tensionKg
        : 23;

    const instructions =
      lang === "fr"
        ? `
Tu es un expert tennis fitter (raquette + cordage).
Tu dois choisir UNIQUEMENT parmi les items fournis. N'invente aucun modèle.
Tu réponds STRICTEMENT en JSON valide, sans texte autour.

Mission :
- sélectionner au maximum 3 raquettes et 3 cordages
- respecter en priorité le classement algorithmique (_score)
- tu peux départager des candidats proches, mais tu ne dois pas promouvoir un item nettement moins bien classé sans raison forte
- personnaliser selon le profil utilisateur
- rester concret, crédible et court

Règles importantes :
- priorise les meilleurs _score
- respecte goal, style, gameType, armPain, firstRacket, stringPriority, breaksOften, fftRank
- si armPain = true, évite les options trop raides/inconfortables
- si firstRacket = true, évite les setups trop exigeants
- pas de prix
- pas de recommandation générique
- pas plus de 3 reasons par item
- si seulement 1 ou 2 choix sont pertinents, n’en renvoie pas 3 de force
- écris TOUTES les reasons et les notes en français

Format JSON EXACT :
{
  "rackets": [
    { "id": "...", "title": "...", "reasons": ["...", "..."] }
  ],
  "strings": [
    { "id": "...", "title": "...", "reasons": ["...", "..."] }
  ],
  "recommendedTensionKg": 22.5,
  "recommendedWeightG": 300,
  "notes": ["...", "..."]
}

Règles de forme :
- title lisible : "Marque Modèle"
- pour un cordage, tu peux ajouter la jauge si utile
- reasons : 1 à 3 bullets max, très concrètes
- notes : 0 à 4 max
`
        : `
You are an expert tennis fitter (racket + string).
You must choose ONLY from the provided items. Do not invent any model.
You must reply STRICTLY in valid JSON, with no extra text around it.

Mission:
- select at most 3 rackets and 3 strings
- prioritize the algorithmic ranking (_score)
- you may slightly reorder close candidates, but you must not promote a clearly lower-ranked item without a strong reason
- personalize the recommendations to the user profile
- stay concrete, credible, and concise

Important rules:
- prioritize the best _score values
- respect goal, style, gameType, armPain, firstRacket, stringPriority, breaksOften, fftRank
- if armPain = true, avoid overly harsh or uncomfortable options
- if firstRacket = true, avoid overly demanding setups
- do not mention price
- do not give generic recommendations
- no more than 3 reasons per item
- if only 1 or 2 choices are truly relevant, do not force 3
- write ALL reasons and notes in English

EXACT JSON format:
{
  "rackets": [
    { "id": "...", "title": "...", "reasons": ["...", "..."] }
  ],
  "strings": [
    { "id": "...", "title": "...", "reasons": ["...", "..."] }
  ],
  "recommendedTensionKg": 22.5,
  "recommendedWeightG": 300,
  "notes": ["...", "..."]
}

Formatting rules:
- title must be readable: "Brand Model"
- for a string, you may add gauge if useful
- reasons: 1 to 3 bullets max, very concrete
- notes: 0 to 4 max
`;

    const input = JSON.stringify(
      {
        lang,
        questionnaire,
        recommendedWeightG: fallbackWeight,
        recommendedTensionKg: fallbackTension,
        computed,
        rackets: shortlistRackets,
        strings: shortlistStrings,
      },
      null,
      2
    );

    const resp = await client.responses.create({
      model: "gpt-5.2",
      instructions,
      input,
    });

    const text = resp.output_text?.trim() || "";

    let parsed: any = null;

    try {
      parsed = JSON.parse(text);
    } catch {
      const a = text.indexOf("{");
      const b = text.lastIndexOf("}");
      if (a !== -1 && b !== -1 && b > a) {
        try {
          parsed = JSON.parse(text.slice(a, b + 1));
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed) {
      return NextResponse.json(buildFallbackOutput(body));
    }

    const out: AiOut = {
      rackets: safeArray(parsed.rackets),
      strings: safeArray(parsed.strings),
      recommendedTensionKg:
        typeof parsed.recommendedTensionKg === "number"
          ? parsed.recommendedTensionKg
          : fallbackTension,
      recommendedWeightG:
        typeof parsed.recommendedWeightG === "number"
          ? parsed.recommendedWeightG
          : fallbackWeight,
      notes: safeArray(parsed.notes),
    };

    out.rackets = out.rackets.slice(0, 3).map((x: any) => ({
      id: typeof x?.id === "string" ? x.id : undefined,
      title: String(x?.title ?? "").trim() || "—",
      reasons: safeArray(x?.reasons)
        .map((r: any) => String(r))
        .filter(Boolean)
        .slice(0, 3),
    }));

    out.strings = out.strings.slice(0, 3).map((x: any) => ({
      id: typeof x?.id === "string" ? x.id : undefined,
      title: String(x?.title ?? "").trim() || "—",
      reasons: safeArray(x?.reasons)
        .map((r: any) => String(r))
        .filter(Boolean)
        .slice(0, 3),
    }));

    out.recommendedTensionKg = clamp05(out.recommendedTensionKg);
    if (out.recommendedTensionKg < 16) out.recommendedTensionKg = 16;
    if (out.recommendedTensionKg > 30) out.recommendedTensionKg = 30;

    out.recommendedWeightG = clampInt(out.recommendedWeightG, 285, 315);

    out.rackets = out.rackets.filter((x) => x.title && x.title !== "—");
    out.strings = out.strings.filter((x) => x.title && x.title !== "—");
    out.notes = out.notes.map((n: any) => String(n)).filter(Boolean).slice(0, 4);

    if (out.rackets.length === 0 && out.strings.length === 0) {
      return NextResponse.json(buildFallbackOutput(body));
    }

    return NextResponse.json(out);
  } catch {
    if (body) {
      return NextResponse.json(buildFallbackOutput(body));
    }

    return NextResponse.json(
      { error: "Unknown error" },
      { status: 500 }
    );
  }
}