"use client";

import { useMemo, useState } from "react";

type FftRank =
  | "NC"
  | "40" | "30/5" | "30/4" | "30/3" | "30/2" | "30/1"
  | "30" | "15/5" | "15/4" | "15/3" | "15/2" | "15/1"
  | "15" | "5/6" | "4/6" | "3/6" | "2/6" | "1/6"
  | "0" | "-2/6" | "-4/6" | "-15";

type Sex = "male" | "female" | "other" | "prefer_not";

type RecommendPayload = {
  fftRank: FftRank;

  // Profil “physique”
  age: number;      // 10..80
  sex: Sex;
  heightCm: number; // 120..220

  frequency: "1-2" | "3-4" | "5+";
  goal: "spin" | "control" | "power" | "comfort";
  style: "lift" | "flat" | "mix";
  gameType: "defense" | "attaque" | "servevolley" | "complet";

  armPain: boolean;
  comfortNeed: number;

  currentRacket: string;
  firstRacket: boolean;
  likes: string;
  dislikes: string;

  targetWeight: number; // préférence perso (curseur)
  headSize: 98 | 100 | 102 | "dontknow";
  racketFeel: "power" | "comfort" | "spin" | "mix";

  stringType: "poly" | "multi" | "hybrid" | "dontknow";
  breaksOften: "yes" | "no" | "dontknow";
  stringPriority: "spin" | "control" | "comfort" | "power";
  tensionKg: number;
};

type RacketResult = {
  id: string;
  brand: string;
  model: string;
  headSize: number;
  weight: number;
  balance?: number | null;
  pattern: string;

  power: number;
  spin: number;
  control: number;
  comfort: number;

  levelMin: number;
  levelMax: number;

  createdAt: string;

  _score?: number;
};

type StringResult = {
  id: string;
  brand: string;
  model: string;
  kind: string;
  gauge: number;

  power: number;
  spin: number;
  control: number;
  comfort: number;
  durability: number;

  createdAt: string;

  _score?: number;
};

type ApiResult = {
  rackets: RacketResult[];
  strings: StringResult[];
  recommendedTension?: number;
  computed?: {
    levelScore?: number;
    weights?: any;
    stringWeights?: any;
  };
};

// Résultat IA attendu côté UI
type AiPick = { title: string; reasons: string[] };

type AiResult = {
  error?: string;

  rackets?: AiPick[];  // max 3
  strings?: AiPick[];  // max 3

  recommendedTensionKg?: number;
  recommendedWeightG?: number;
  notes?: string[];
};

const FFT_OPTIONS: FftRank[] = [
  "NC",
  "40", "30/5", "30/4", "30/3", "30/2", "30/1",
  "30", "15/5", "15/4", "15/3", "15/2", "15/1",
  "15", "5/6", "4/6", "3/6", "2/6", "1/6",
  "0", "-2/6", "-4/6", "-15",
];

// ---- UI helpers (classes)
const card =
  "rounded-3xl border border-white/15 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur";
const label = "text-sm font-medium text-white/90";
const input =
  "rounded-2xl border border-white/15 bg-emerald-950/30 p-3 text-white placeholder:text-white/40 outline-none transition focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/20";

export default function Home() {
  const [loading, setLoading] = useState(false);

  // shortlist DB (cachée)
  const [data, setData] = useState<ApiResult | null>(null);

  // affichage final = IA
  const [ai, setAi] = useState<AiResult | null>(null);

  const [form, setForm] = useState<RecommendPayload>({
    fftRank: "15/2",

    age: 25,
    sex: "prefer_not",
    heightCm: 175,

    frequency: "3-4",
    goal: "spin",
    style: "lift",
    gameType: "attaque",

    armPain: false,
    comfortNeed: 5, // (gardé pour compat logique, pas affiché)

    currentRacket: "",
    firstRacket: false,
    likes: "",
    dislikes: "",

    targetWeight: 300,
    headSize: "dontknow",
    racketFeel: "mix",

    stringType: "dontknow",
    breaksOften: "dontknow",
    stringPriority: "spin",
    tensionKg: 23,
  });

  function update<K extends keyof RecommendPayload>(key: K, value: RecommendPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const comfortHint = useMemo(() => {
    if (!form.armPain) return null;
    return "Gêne au bras : on privilégie un setup plus confort (cordage plus doux / tension plus basse).";
  }, [form.armPain]);

  async function submit() {
    setLoading(true);
    setData(null);
    setAi(null);

    try {
      // 1) shortlist DB
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API /recommend erreur (${res.status}) : ${txt}`);
      }

      const json = (await res.json()) as ApiResult;
      setData(json);

      // 2) arbitrage IA (shortlist limitée)
      const aiRes = await fetch("/api/recommend/recommend-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionnaire: form,
          recommendedWeightG: form.targetWeight, // ✅
          rackets: (json.rackets ?? []).slice(0, 10),
          strings: (json.strings ?? []).slice(0, 10),
          computed: json.computed ?? {},
        }),
      });

      if (!aiRes.ok) {
        const txt = await aiRes.text();
        throw new Error(`API IA erreur (${aiRes.status}) : ${txt}`);
      }

      const aiJson = (await aiRes.json()) as AiResult;
      setAi(aiJson);
    } catch (e) {
      console.error(e);
      alert("Erreur. Ouvre la console (F12) et envoie-moi le message exact.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <div className="relative min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950">
        {/* Court lines */}
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/40" />
          <div className="absolute left-8 right-8 top-24 h-[2px] bg-white/40" />
          <div className="absolute left-8 right-8 bottom-24 h-[2px] bg-white/40" />
          <div className="absolute left-8 top-24 h-[calc(100%-12rem)] w-[2px] bg-white/25" />
          <div className="absolute right-8 top-24 h-[calc(100%-12rem)] w-[2px] bg-white/25" />
        </div>

        {/* Tennis balls (blur circles) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" />
          <div className="absolute top-40 right-10 h-64 w-64 rounded-full bg-lime-300/15 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />
          {/* seams hint */}
          <div className="absolute top-20 left-10 h-48 w-48 rotate-12 rounded-full border border-white/15 blur-[0.5px]" />
          <div className="absolute bottom-24 right-16 h-40 w-40 -rotate-12 rounded-full border border-white/10 blur-[0.5px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 py-10">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/90">
              <span className="h-2 w-2 rounded-full bg-lime-300" />
              Tennis recommendation engine
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Whichracket <span className="text-lime-300">🎾</span>
            </h1>

            <p className="text-sm text-white/75">
            </p>

            <button
              onClick={submit}
              disabled={loading}
              className="group mt-2 inline-flex items-center justify-center rounded-2xl bg-lime-300 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-lime-300/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-950/10">
                {loading ? "⏳" : "🏁"}
              </span>
              {loading ? "Analyse en cours..." : "Trouver ma raquette + mon cordage"}
              <span className="ml-2 opacity-70 transition group-hover:translate-x-0.5">→</span>
            </button>
          </div>

          {/* FORM */}
          <div className="mt-8 grid gap-6">
            {/* 0) Profil physique */}
            <section className={card}>
              <h2 className="text-lg font-semibold">Profil</h2>
              <p className="mt-1 text-xs text-white/70">
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className={label}>Âge</label>
                  <input
                    type="number"
                    min={10}
                    max={80}
                    className={input}
                    value={form.age}
                    onChange={(e) => update("age", Number(e.target.value))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className={label}>Sexe</label>
                  <select
                    className={input}
                    value={form.sex}
                    onChange={(e) => update("sex", e.target.value as Sex)}
                  >
                    <option value="prefer_not">Je préfère ne pas dire</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Taille (cm)</label>
                  <input
                    type="number"
                    min={120}
                    max={220}
                    className={input}
                    value={form.heightCm}
                    onChange={(e) => update("heightCm", Number(e.target.value))}
                  />
                </div>
              </div>
            </section>

            {/* 1) Profil joueur */}
            <section className={card}>
              <h2 className="text-lg font-semibold">Profil joueur</h2>
              <p className="mt-1 text-xs text-white/70">
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className={label}>Classement FFT</label>
                  <select
                    className={input}
                    value={form.fftRank}
                    onChange={(e) => update("fftRank", e.target.value as FftRank)}
                  >
                    {FFT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Fréquence</label>
                  <select
                    className={input}
                    value={form.frequency}
                    onChange={(e) => update("frequency", e.target.value as RecommendPayload["frequency"])}
                  >
                    <option value="1-2">1–2 fois / semaine</option>
                    <option value="3-4">3–4 fois / semaine</option>
                    <option value="5+">5+ fois / semaine</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Priorité</label>
                  <select
                    className={input}
                    value={form.goal}
                    onChange={(e) => update("goal", e.target.value as RecommendPayload["goal"])}
                  >
                    <option value="spin">Lift / Spin</option>
                    <option value="control">Contrôle</option>
                    <option value="power">Puissance</option>
                    <option value="comfort">Confort</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Frappe</label>
                  <select
                    className={input}
                    value={form.style}
                    onChange={(e) => update("style", e.target.value as RecommendPayload["style"])}
                  >
                    <option value="lift">Lift</option>
                    <option value="flat">À plat</option>
                    <option value="mix">Mix</option>
                  </select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className={label}>Type de jeu</label>
                  <select
                    className={input}
                    value={form.gameType}
                    onChange={(e) => update("gameType", e.target.value as RecommendPayload["gameType"])}
                  >
                    <option value="defense">Défense / Contreur</option>
                    <option value="attaque">Attaque</option>
                    <option value="servevolley">Service-volée</option>
                    <option value="complet">Complet</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 2) Bras */}
            <section className={card}>
              <h2 className="text-lg font-semibold">Bras</h2>
              <p className="mt-1 text-xs text-white/70">
              </p>

              <div className="mt-5">
                <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-emerald-950/20 p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={form.armPain}
                    onChange={(e) => update("armPain", e.target.checked)}
                    className="h-4 w-4 accent-lime-300"
                  />
                  <span className="text-white">J’ai parfois mal au bras/épaule/poignet</span>
                </label>
              </div>

              {comfortHint && (
                <div className="mt-4 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm text-lime-50">
                  {comfortHint}
                </div>
              )}
            </section>

            {/* 3) Raquette actuelle */}
            <section className={card}>
              <h2 className="text-lg font-semibold">Ta raquette actuelle</h2>
              <p className="mt-1 text-xs text-white/70">
              </p>

            <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-emerald-950/20 p-4 text-sm">
              <input
                type="checkbox"
                checked={form.firstRacket}
                onChange={(e) => {
                  const checked = e.target.checked;
                  update("firstRacket", checked);

                  if (checked) {
                    update("currentRacket", "");
                    update("likes", "");
                    update("dislikes", "");
                  }
                }}
                className="h-4 w-4 accent-lime-300"
              />
              <span className="text-white">
                C’est ma première raquette (je n’en ai jamais vraiment utilisé)
              </span>
            </label>

            {!form.firstRacket && (
              <>
                <div className="grid gap-2">
                  <label className={label}>Modèle actuel</label>
                  <input
                    className={input}
                    placeholder="Ex: Blade 98 v9, Pure Aero, Speed MP..."
                    value={form.currentRacket}
                    onChange={(e) => update("currentRacket", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className={label}>Ce que tu aimes</label>
                  <textarea
                    className={input}
                    rows={3}
                    placeholder="Ex: contrôle, stabilité, sensations..."
                    value={form.likes}
                    onChange={(e) => update("likes", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className={label}>Ce que tu veux améliorer</label>
                  <textarea
                    className={input}
                    rows={3}
                    placeholder="Ex: profondeur, puissance, lift, confort..."
                    value={form.dislikes}
                    onChange={(e) => update("dislikes", e.target.value)}
                  />
                </div>
              </>
            )}
            </section>

            {/* 4) Préférences raquette */}
            <section className={card}>
              <h2 className="text-lg font-semibold">Préférences raquette</h2>
              <p className="mt-1 text-xs text-white/70">
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                  <label className={label}>Poids cible (préférence)</label>
                  <input
                    type="range"
                    min={285}
                    max={315}
                    value={form.targetWeight}
                    onChange={(e) => update("targetWeight", Number(e.target.value))}
                    className="accent-lime-300"
                  />
                  <div className="text-sm text-white/90">{form.targetWeight} g</div>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Tamis</label>
                  <select
                    className={input}
                    value={form.headSize}
                    onChange={(e) => update("headSize", Number(e.target.value) as 98 | 100 | 102)}
                  >
                    <option value={98}>98 (plus précis)</option>
                    <option value={100}>100 (standard)</option>
                    <option value={102}>102+ (plus tolérant)</option>
                    <option value="dontknow">Je ne sais pas</option>
                  </select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className={label}>Sensations recherchées</label>
                  <select
                    className={input}
                    value={form.racketFeel}
                    onChange={(e) => update("racketFeel", e.target.value as RecommendPayload["racketFeel"])}
                  >
                    <option value="power">Puissance</option>
                    <option value="comfort">Confort</option>
                    <option value="spin">Spin</option>
                    <option value="mix">Mix / équilibrée</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 5) Cordage */}
            <section className={card}>
              <h2 className="text-lg font-semibold">Cordage</h2>
              <p className="mt-1 text-xs text-white/70">
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className={label}>Type</label>
                  <select
                    className={input}
                    value={form.stringType}
                    onChange={(e) => update("stringType", e.target.value as RecommendPayload["stringType"])}
                  >
                    <option value="dontknow">Je ne sais pas</option>
                    <option value="poly">Polyester monofilament</option>
                    <option value="multi">Multifilament</option>
                    <option value="hybrid">Hybride</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Tu casses souvent ?</label>
                  <select
                    className={input}
                    value={form.breaksOften}
                    onChange={(e) => update("breaksOften", e.target.value as RecommendPayload["breaksOften"])}
                  >
                    <option value="dontknow">Je ne sais pas</option>
                    <option value="yes">Oui</option>
                    <option value="no">Non</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Priorité</label>
                  <select
                    className={input}
                    value={form.stringPriority}
                    onChange={(e) => update("stringPriority", e.target.value as RecommendPayload["stringPriority"])}
                  >
                    <option value="spin">Spin</option>
                    <option value="control">Contrôle</option>
                    <option value="power">Puissance</option>
                    <option value="comfort">Confort</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>Tension actuelle (repère)</label>
                  <input
                    type="number"
                    className={input}
                    min={16}
                    max={30}
                    value={form.tensionKg}
                    onChange={(e) => update("tensionKg", Number(e.target.value))}
                  />
                </div>
              </div>
            </section>

            {/* CTA bottom */}
            <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-white/10 to-white/5 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">Lancer l’analyse</p>
                  <p className="mt-1 text-xs text-white/70">
                  </p>
                </div>

                <button
                  onClick={submit}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl bg-lime-300 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-lime-300/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Analyse en cours..." : "Trouver ma raquette + mon cordage"}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTAT */}
          {ai && !ai.error && (
            <section className={"mt-8 " + card}>
              <h2 className="text-lg font-semibold">Choix final</h2>
              <p className="mt-1 text-xs text-white/70">
              </p>

              <div className="mt-5 grid gap-4">
                {(typeof ai.recommendedWeightG === "number" || typeof ai.recommendedTensionKg === "number") && (
                  <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {typeof ai.recommendedWeightG === "number" && (
                        <div>
                          <p className="text-xs text-white/70">Poids conseillé</p>
                          <p className="mt-1 text-sm font-semibold">
                            {ai.recommendedWeightG} g
                          </p>
                        </div>
                      )}
                      {typeof ai.recommendedTensionKg === "number" && (
                        <div>
                          <p className="text-xs text-white/70">Tension recommandée</p>
                          <p className="mt-1 text-sm font-semibold">
                            {ai.recommendedTensionKg} kg
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                  <p className="font-medium">Raquettes</p>

                  {(ai.rackets?.length ?? 0) > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {ai.rackets!.slice(0, 3).map((r, idx) => (
                        <div key={idx} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                          <p className="font-medium">
                            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-xl bg-lime-300/15 text-xs text-lime-100">
                              {idx + 1}
                            </span>
                            {r.title}
                          </p>
                          <ul className="mt-2 list-disc pl-5 text-sm text-white/85">
                            {(r.reasons ?? []).slice(0, 4).map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-white/70">Aucune raquette renvoyée.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                  <p className="font-medium">Cordages</p>

                  {(ai.strings?.length ?? 0) > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {ai.strings!.slice(0, 3).map((s, idx) => (
                        <div key={idx} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                          <p className="font-medium">
                            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-xl bg-lime-300/15 text-xs text-lime-100">
                              {idx + 1}
                            </span>
                            {s.title}
                          </p>
                          <ul className="mt-2 list-disc pl-5 text-sm text-white/85">
                            {(s.reasons ?? []).slice(0, 4).map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-white/70">Aucun cordage renvoyé.</p>
                  )}
                </div>

                {(ai.notes?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                    <p className="font-medium">Notes</p>
                    <ul className="mt-2 list-disc pl-5 text-sm text-white/85">
                      {ai.notes!.slice(0, 6).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {ai?.error && (
            <section className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-6 shadow-xl shadow-black/20 backdrop-blur">
              <h2 className="text-lg font-semibold text-red-200">Erreur</h2>
              <p className="mt-2 text-sm text-red-100/90">{ai.error}</p>
            </section>
          )}

          {/* data = cachée */}
          {data && null}

          <div className="mt-10 text-center text-xs text-white/50">
            Projet personnel à but expérimental, sans affiliation avec aucune marque, feedback sur instagram: nicolas.dib_
          </div>
        </div>
      </div>
    </main>
  );
}