import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AiPick = { id?: string; title: string; reasons: string[] };

type AiOut = {
  rackets: AiPick[]; // max 3
  strings: AiPick[]; // max 3
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { questionnaire, rackets, strings, computed, recommendedWeightG } = body ?? {};

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY manquante dans .env" },
        { status: 500 }
      );
    }

    if (!Array.isArray(rackets) || !Array.isArray(strings)) {
      return NextResponse.json(
        { error: "Payload invalide: rackets/strings doivent être des tableaux." },
        { status: 400 }
      );
    }

    // ✅ Fallback poids (on ne dépend PAS de âge/sex/taille ici)
    const fallbackWeight =
      typeof recommendedWeightG === "number"
        ? recommendedWeightG
        : typeof questionnaire?.targetWeight === "number"
        ? questionnaire.targetWeight
        : 300;

    const instructions = `
Tu es un expert tennis fitter (raquette + cordage).
Tu dois choisir UNIQUEMENT parmi les items fournis (rackets/strings). N'invente rien.
Tu réponds STRICTEMENT en JSON valide, sans aucun texte autour.

Objectif:
- Proposer MAX 3 raquettes classées (#1, #2, #3) et MAX 3 cordages classés
- Donner une tension recommandée (par pas de 0.5 kg)
- Donner un poids conseillé (en grammes) cohérent avec la shortlist et la préférence utilisateur
- Expliquer en bullets: court, clair, concret (3 bullets max par item)

Contraintes:
- Si armPain: éviter poly trop raide, tension plus basse.
- Respecter goal/style/gameType et le niveau FFT.
- Ne parle pas de prix.
- Ne renvoie jamais plus de 3 raquettes ou 3 cordages.
- Le "recommendedWeightG" doit être un entier (ex: 285, 300, 305) cohérent avec la shortlist.

Format JSON EXACT:
{
  "rackets": [
    {"id":"...", "title":"...", "reasons":["...","..."]}
  ],
  "strings": [
    {"id":"...", "title":"...", "reasons":["...","..."]}
  ],
  "recommendedTensionKg": 22.5,
  "recommendedWeightG": 300,
  "notes": ["...","..."]
}

Règles supplémentaires:
- title doit être lisible: "Marque Modèle" (+ jauge/type pour un cordage si utile)
- reasons: 1 à 3 bullets MAX
- Si tu n'as pas 3 choix pertinents, renvoie 1 ou 2 éléments (pas de placeholders).
- Tu es un expert, il faut que les recommandations soient pertinentes et personnalisées selon le profil et les préférences (pas de suggestions génériques).
`;

    const input = JSON.stringify(
      {
        questionnaire,
        recommendedWeightG: fallbackWeight,
        rackets,
        strings,
        computed,
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

    // parse JSON robuste
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
      return NextResponse.json(
        { error: "AI JSON parse failed", raw: text },
        { status: 500 }
      );
    }

    // Normalisation + garde-fous
    const out: AiOut = {
      rackets: safeArray(parsed.rackets),
      strings: safeArray(parsed.strings),
      recommendedTensionKg:
        typeof parsed.recommendedTensionKg === "number"
          ? parsed.recommendedTensionKg
          : typeof questionnaire?.tensionKg === "number"
          ? questionnaire.tensionKg
          : 23,
      recommendedWeightG:
        typeof parsed.recommendedWeightG === "number"
          ? parsed.recommendedWeightG
          : fallbackWeight,
      notes: safeArray(parsed.notes),
    };

    // coupe à 3 max + nettoyage
    out.rackets = out.rackets.slice(0, 3).map((x: any) => ({
      id: typeof x?.id === "string" ? x.id : undefined,
      title: String(x?.title ?? "").trim() || "—",
      reasons: safeArray(x?.reasons).map((r: any) => String(r)).slice(0, 3),
    }));

    out.strings = out.strings.slice(0, 3).map((x: any) => ({
      id: typeof x?.id === "string" ? x.id : undefined,
      title: String(x?.title ?? "").trim() || "—",
      reasons: safeArray(x?.reasons).map((r: any) => String(r)).slice(0, 3),
    }));

    // tension: arrondi 0.5 + bornes
    out.recommendedTensionKg = clamp05(out.recommendedTensionKg);
    if (out.recommendedTensionKg < 16) out.recommendedTensionKg = 16;
    if (out.recommendedTensionKg > 30) out.recommendedTensionKg = 30;

    // poids: entier + bornes raisonnables
    out.recommendedWeightG = clampInt(out.recommendedWeightG, 285, 315);

    // nettoie les titres vides
    out.rackets = out.rackets.filter((x) => x.title && x.title !== "—");
    out.strings = out.strings.filter((x) => x.title && x.title !== "—");
    out.notes = out.notes.map((n: any) => String(n)).filter(Boolean).slice(0, 8);

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}