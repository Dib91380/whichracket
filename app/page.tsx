"use client";

import { useEffect, useMemo, useState } from "react";

type Lang = "fr" | "en";

type FftRank =
  | "NC"
  | "40" | "30/5" | "30/4" | "30/3" | "30/2" | "30/1"
  | "30" | "15/5" | "15/4" | "15/3" | "15/2" | "15/1"
  | "15" | "5/6" | "4/6" | "3/6" | "2/6" | "1/6"
  | "0" | "-2/6" | "-4/6" | "-15";

type Sex = "male" | "female" | "other" | "prefer_not";

type RecommendPayload = {
  fftRank: FftRank;

  age: number;
  sex: Sex;
  heightCm: number;

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

  targetWeight: number;
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

type AiPick = {
  title: string;
  reasons: string[];
};

type AiResult = {
  error?: string;
  rackets?: AiPick[];
  strings?: AiPick[];
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

const card =
  "rounded-3xl border border-white/15 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur";
const label = "text-sm font-medium text-white/90";
const input =
  "rounded-2xl border border-white/15 bg-emerald-950/30 p-3 text-white placeholder:text-white/40 outline-none transition focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/20";

const translations = {
  fr: {
    badge: "Tennis recommendation engine",
    mainTitle: "Whichracket",
    switchFr: "FR",
    switchEn: "EN",

    ctaMain: "Trouver ma raquette + mon cordage",
    loading: "Analyse en cours...",

    profile: "Profil",
    age: "Âge",
    sex: "Sexe",
    height: "Taille (cm)",

    preferNot: "Je préfère ne pas dire",
    male: "Homme",
    female: "Femme",
    other: "Autre",

    playerProfile: "Profil joueur",
    fftRank: "Classement FFT",
    frequency: "Fréquence",
    priority: "Priorité",
    stroke: "Frappe",
    gameType: "Type de jeu",

    freq12: "1–2 fois / semaine",
    freq34: "3–4 fois / semaine",
    freq5: "5+ fois / semaine",

    goalSpin: "Lift / Spin",
    goalControl: "Contrôle",
    goalPower: "Puissance",
    goalComfort: "Confort",

    styleLift: "Lift",
    styleFlat: "À plat",
    styleMix: "Mix",

    gameDefense: "Défense / Contreur",
    gameAttack: "Attaque",
    gameServeVolley: "Service-volée",
    gameComplete: "Complet",

    arm: "Bras",
    armPainLabel: "J’ai parfois mal au bras/épaule/poignet",
    comfortHint:
      "Gêne au bras : on privilégie un setup plus confort (cordage plus doux / tension plus basse).",

    currentRacket: "Ta raquette actuelle",
    firstRacket:
      "C’est ma première raquette (je n’en ai jamais vraiment utilisé)",
    currentModel: "Modèle actuel",
    currentModelPlaceholder: "Ex: Blade 98 v9, Pure Aero, Speed MP...",
    likes: "Ce que tu aimes",
    likesPlaceholder: "Ex: contrôle, stabilité, sensations...",
    dislikes: "Ce que tu veux améliorer",
    dislikesPlaceholder: "Ex: profondeur, puissance, lift, confort...",

    preferences: "Préférences raquette",
    targetWeight: "Poids cible (préférence)",
    headSize: "Tamis",
    head98: "98 (plus précis)",
    head100: "100 (standard)",
    head102: "102+ (plus tolérant)",
    dontKnow: "Je ne sais pas",
    racketFeel: "Sensations recherchées",
    feelPower: "Puissance",
    feelComfort: "Confort",
    feelSpin: "Spin",
    feelMix: "Mix / équilibrée",

    string: "Cordage",
    stringType: "Type",
    poly: "Polyester monofilament",
    multi: "Multifilament",
    hybrid: "Hybride",

    breaksOften: "Tu casses souvent ?",
    yes: "Oui",
    no: "Non",

    stringPriority: "Priorité",
    tensionCurrent: "Tension actuelle (repère)",

    launchAnalysis: "Lancer l’analyse",

    finalChoice: "Choix final",
    advisedWeight: "Poids conseillé",
    advisedTension: "Tension recommandée",
    rackets: "Raquettes",
    strings: "Cordages",
    notes: "Notes",
    noRacket: "Aucune raquette renvoyée.",
    noString: "Aucun cordage renvoyé.",

    error: "Erreur",
    alertError: "Erreur, ouvre F12 pour voir le détail.",

    footer:
      "Projet personnel à but expérimental, sans affiliation avec aucune marque, feedback ou collboration bienvenue sur instagram : nicolas.dib_ ou par email : nicolas.dib@icloud.com",
  },
  en: {
    badge: "Tennis recommendation engine",
    mainTitle: "Whichracket",
    switchFr: "FR",
    switchEn: "EN",

    ctaMain: "Find my racket + my string",
    loading: "Analyzing...",

    profile: "Profile",
    age: "Age",
    sex: "Sex",
    height: "Height (cm)",

    preferNot: "Prefer not to say",
    male: "Male",
    female: "Female",
    other: "Other",

    playerProfile: "Player profile",
    fftRank: "FFT ranking",
    frequency: "Frequency",
    priority: "Priority",
    stroke: "Stroke style",
    gameType: "Playing style",

    freq12: "1–2 times / week",
    freq34: "3–4 times / week",
    freq5: "5+ times / week",

    goalSpin: "Spin",
    goalControl: "Control",
    goalPower: "Power",
    goalComfort: "Comfort",

    styleLift: "Topspin",
    styleFlat: "Flat",
    styleMix: "Mixed",

    gameDefense: "Defense / Counterpuncher",
    gameAttack: "Attacking",
    gameServeVolley: "Serve and volley",
    gameComplete: "All-court",

    arm: "Arm",
    armPainLabel: "I sometimes have pain in my arm/shoulder/wrist",
    comfortHint:
      "Arm sensitivity detected: we prioritize a more comfortable setup (softer string / lower tension).",

    currentRacket: "Your current racket",
    firstRacket: "This is my first racket (I have never really used one before)",
    currentModel: "Current model",
    currentModelPlaceholder: "Ex: Blade 98 v9, Pure Aero, Speed MP...",
    likes: "What you like",
    likesPlaceholder: "Ex: control, stability, feel...",
    dislikes: "What you want to improve",
    dislikesPlaceholder: "Ex: depth, power, spin, comfort...",

    preferences: "Racket preferences",
    targetWeight: "Target weight (preference)",
    headSize: "Head size",
    head98: "98 (more precise)",
    head100: "100 (standard)",
    head102: "102+ (more forgiving)",
    dontKnow: "I don't know",
    racketFeel: "Desired feel",
    feelPower: "Power",
    feelComfort: "Comfort",
    feelSpin: "Spin",
    feelMix: "Balanced",

    string: "Strings",
    stringType: "Type",
    poly: "Polyester monofilament",
    multi: "Multifilament",
    hybrid: "Hybrid",

    breaksOften: "Do you break strings often?",
    yes: "Yes",
    no: "No",

    stringPriority: "Priority",
    tensionCurrent: "Current tension (reference)",

    launchAnalysis: "Run analysis",

    finalChoice: "Final choice",
    advisedWeight: "Recommended weight",
    advisedTension: "Recommended tension",
    rackets: "Rackets",
    strings: "Strings",
    notes: "Notes",
    noRacket: "No racket returned.",
    noString: "No string returned.",

    error: "Error",
    alertError: "Error, open F12 to see details.",

    footer:
      "Personal experimental project, not affiliated with any brand. Feedback on instagram: nicolas.dib_",
  },
} as const;

export default function Home() {
  const [lang, setLang] = useState<Lang>("fr");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResult | null>(null);
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
    comfortNeed: 5,

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

  const t = translations[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem("whichracket-lang") as Lang | null;

    if (saved === "fr" || saved === "en") {
      setLang(saved);
      return;
    }

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("en")) {
      setLang("en");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("whichracket-lang", lang);
  }, [lang]);

  function update<K extends keyof RecommendPayload>(key: K, value: RecommendPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const comfortHint = useMemo(() => {
    if (!form.armPain) return null;
    return t.comfortHint;
  }, [form.armPain, t.comfortHint]);

  async function submit() {
    setLoading(true);
    setData(null);
    setAi(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API /recommend error (${res.status}) : ${txt}`);
      }

      const json = (await res.json()) as ApiResult;
      setData(json);

      const aiRes = await fetch("/api/recommend/recommend-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          questionnaire: form,
          recommendedWeightG: form.targetWeight,
          rackets: (json.rackets ?? []).slice(0, 5),
          strings: (json.strings ?? []).slice(0, 5),
          computed: {
            ...(json.computed ?? {}),
            recommendedTension: json.recommendedTension,
          },
        }),
      });

      if (!aiRes.ok) {
        const txt = await aiRes.text();
        throw new Error(`AI API error (${aiRes.status}) : ${txt}`);
      }

      const aiJson = (await aiRes.json()) as AiResult;
      setAi(aiJson);
    } catch (e) {
      console.error(e);
      alert(t.alertError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <div className="relative min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/40" />
          <div className="absolute left-8 right-8 top-24 h-[2px] bg-white/40" />
          <div className="absolute left-8 right-8 bottom-24 h-[2px] bg-white/40" />
          <div className="absolute left-8 top-24 h-[calc(100%-12rem)] w-[2px] bg-white/25" />
          <div className="absolute right-8 top-24 h-[calc(100%-12rem)] w-[2px] bg-white/25" />
        </div>

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" />
          <div className="absolute top-40 right-10 h-64 w-64 rounded-full bg-lime-300/15 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="absolute top-20 left-10 h-48 w-48 rotate-12 rounded-full border border-white/15 blur-[0.5px]" />
          <div className="absolute bottom-24 right-16 h-40 w-40 -rotate-12 rounded-full border border-white/10 blur-[0.5px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/90">
                <span className="h-2 w-2 rounded-full bg-lime-300" />
                {t.badge}
              </div>

              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 p-1">
                <button
                  onClick={() => setLang("fr")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    lang === "fr"
                      ? "bg-lime-300 text-emerald-950"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {t.switchFr}
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    lang === "en"
                      ? "bg-lime-300 text-emerald-950"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {t.switchEn}
                </button>
              </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl flex items-center gap-2">
              {t.mainTitle}
              <img
                src="/rackets.png"
                alt="tennis rackets"
                className="h-10 w-10"
              />
            </h1>

            <button
              onClick={submit}
              disabled={loading}
              className="group mt-2 inline-flex items-center justify-center rounded-2xl bg-lime-300 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-lime-300/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-950/10">
                {loading ? "⏳" : "🔎"}
              </span>
              {loading ? t.loading : t.ctaMain}
              <span className="ml-2 opacity-70 transition group-hover:translate-x-0.5">→</span>
            </button>
          </div>

          <div className="mt-8 grid gap-6">
            <section className={card}>
              <h2 className="text-lg font-semibold">{t.profile}</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className={label}>{t.age}</label>
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
                  <label className={label}>{t.sex}</label>
                  <select
                    className={input}
                    value={form.sex}
                    onChange={(e) => update("sex", e.target.value as Sex)}
                  >
                    <option value="prefer_not">{t.preferNot}</option>
                    <option value="male">{t.male}</option>
                    <option value="female">{t.female}</option>
                    <option value="other">{t.other}</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>{t.height}</label>
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

            <section className={card}>
              <h2 className="text-lg font-semibold">{t.playerProfile}</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className={label}>{t.fftRank}</label>
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
                  <label className={label}>{t.frequency}</label>
                  <select
                    className={input}
                    value={form.frequency}
                    onChange={(e) =>
                      update("frequency", e.target.value as RecommendPayload["frequency"])
                    }
                  >
                    <option value="1-2">{t.freq12}</option>
                    <option value="3-4">{t.freq34}</option>
                    <option value="5+">{t.freq5}</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>{t.priority}</label>
                  <select
                    className={input}
                    value={form.goal}
                    onChange={(e) =>
                      update("goal", e.target.value as RecommendPayload["goal"])
                    }
                  >
                    <option value="spin">{t.goalSpin}</option>
                    <option value="control">{t.goalControl}</option>
                    <option value="power">{t.goalPower}</option>
                    <option value="comfort">{t.goalComfort}</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>{t.stroke}</label>
                  <select
                    className={input}
                    value={form.style}
                    onChange={(e) =>
                      update("style", e.target.value as RecommendPayload["style"])
                    }
                  >
                    <option value="lift">{t.styleLift}</option>
                    <option value="flat">{t.styleFlat}</option>
                    <option value="mix">{t.styleMix}</option>
                  </select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className={label}>{t.gameType}</label>
                  <select
                    className={input}
                    value={form.gameType}
                    onChange={(e) =>
                      update("gameType", e.target.value as RecommendPayload["gameType"])
                    }
                  >
                    <option value="defense">{t.gameDefense}</option>
                    <option value="attaque">{t.gameAttack}</option>
                    <option value="servevolley">{t.gameServeVolley}</option>
                    <option value="complet">{t.gameComplete}</option>
                  </select>
                </div>
              </div>
            </section>

            <section className={card}>
              <h2 className="text-lg font-semibold">{t.arm}</h2>

              <div className="mt-5">
                <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-emerald-950/20 p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={form.armPain}
                    onChange={(e) => update("armPain", e.target.checked)}
                    className="h-4 w-4 accent-lime-300"
                  />
                  <span className="text-white">{t.armPainLabel}</span>
                </label>
              </div>

              {comfortHint && (
                <div className="mt-4 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm text-lime-50">
                  {comfortHint}
                </div>
              )}
            </section>

            <section className={card}>
              <h2 className="text-lg font-semibold">{t.currentRacket}</h2>

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
                <span className="text-white">{t.firstRacket}</span>
              </label>

              {!form.firstRacket && (
                <>
                  <div className="mt-5 grid gap-4">
                    <div className="grid gap-2">
                      <label className={label}>{t.currentModel}</label>
                      <input
                        className={input}
                        placeholder={t.currentModelPlaceholder}
                        value={form.currentRacket}
                        onChange={(e) => update("currentRacket", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className={label}>{t.likes}</label>
                      <textarea
                        className={input}
                        rows={3}
                        placeholder={t.likesPlaceholder}
                        value={form.likes}
                        onChange={(e) => update("likes", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className={label}>{t.dislikes}</label>
                      <textarea
                        className={input}
                        rows={3}
                        placeholder={t.dislikesPlaceholder}
                        value={form.dislikes}
                        onChange={(e) => update("dislikes", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className={card}>
              <h2 className="text-lg font-semibold">{t.preferences}</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                  <label className={label}>{t.targetWeight}</label>
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
                  <label className={label}>{t.headSize}</label>
                  <select
                    className={input}
                    value={form.headSize}
                    onChange={(e) =>
                      update(
                        "headSize",
                        e.target.value === "dontknow"
                          ? "dontknow"
                          : (Number(e.target.value) as 98 | 100 | 102)
                      )
                    }
                  >
                    <option value={98}>{t.head98}</option>
                    <option value={100}>{t.head100}</option>
                    <option value={102}>{t.head102}</option>
                    <option value="dontknow">{t.dontKnow}</option>
                  </select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className={label}>{t.racketFeel}</label>
                  <select
                    className={input}
                    value={form.racketFeel}
                    onChange={(e) =>
                      update("racketFeel", e.target.value as RecommendPayload["racketFeel"])
                    }
                  >
                    <option value="power">{t.feelPower}</option>
                    <option value="comfort">{t.feelComfort}</option>
                    <option value="spin">{t.feelSpin}</option>
                    <option value="mix">{t.feelMix}</option>
                  </select>
                </div>
              </div>
            </section>

            <section className={card}>
              <h2 className="text-lg font-semibold">{t.string}</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className={label}>{t.stringType}</label>
                  <select
                    className={input}
                    value={form.stringType}
                    onChange={(e) =>
                      update("stringType", e.target.value as RecommendPayload["stringType"])
                    }
                  >
                    <option value="dontknow">{t.dontKnow}</option>
                    <option value="poly">{t.poly}</option>
                    <option value="multi">{t.multi}</option>
                    <option value="hybrid">{t.hybrid}</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>{t.breaksOften}</label>
                  <select
                    className={input}
                    value={form.breaksOften}
                    onChange={(e) =>
                      update("breaksOften", e.target.value as RecommendPayload["breaksOften"])
                    }
                  >
                    <option value="dontknow">{t.dontKnow}</option>
                    <option value="yes">{t.yes}</option>
                    <option value="no">{t.no}</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>{t.stringPriority}</label>
                  <select
                    className={input}
                    value={form.stringPriority}
                    onChange={(e) =>
                      update(
                        "stringPriority",
                        e.target.value as RecommendPayload["stringPriority"]
                      )
                    }
                  >
                    <option value="spin">{t.goalSpin}</option>
                    <option value="control">{t.goalControl}</option>
                    <option value="power">{t.goalPower}</option>
                    <option value="comfort">{t.goalComfort}</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className={label}>{t.tensionCurrent}</label>
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

            <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-white/10 to-white/5 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{t.launchAnalysis}</p>
                </div>

                <button
                  onClick={submit}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl bg-lime-300 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-lime-300/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? t.loading : t.ctaMain}
                </button>
              </div>
            </div>
          </div>

          {ai && !ai.error && (
            <section className={"mt-8 " + card}>
              <h2 className="text-lg font-semibold">{t.finalChoice}</h2>

              <div className="mt-5 grid gap-4">
                {(typeof ai.recommendedWeightG === "number" ||
                  typeof ai.recommendedTensionKg === "number") && (
                  <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {typeof ai.recommendedWeightG === "number" && (
                        <div>
                          <p className="text-xs text-white/70">{t.advisedWeight}</p>
                          <p className="mt-1 text-sm font-semibold">
                            {ai.recommendedWeightG} g
                          </p>
                        </div>
                      )}
                      {typeof ai.recommendedTensionKg === "number" && (
                        <div>
                          <p className="text-xs text-white/70">{t.advisedTension}</p>
                          <p className="mt-1 text-sm font-semibold">
                            {ai.recommendedTensionKg} kg
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                  <p className="font-medium">{t.rackets}</p>

                  {(ai.rackets?.length ?? 0) > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {ai.rackets!.slice(0, 3).map((r, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/15 bg-white/5 p-4"
                        >
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
                    <p className="mt-2 text-sm text-white/70">{t.noRacket}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                  <p className="font-medium">{t.strings}</p>

                  {(ai.strings?.length ?? 0) > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {ai.strings!.slice(0, 3).map((s, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/15 bg-white/5 p-4"
                        >
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
                    <p className="mt-2 text-sm text-white/70">{t.noString}</p>
                  )}
                </div>

                {(ai.notes?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-white/15 bg-emerald-950/20 p-4">
                    <p className="font-medium">{t.notes}</p>
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
              <h2 className="text-lg font-semibold text-red-200">{t.error}</h2>
              <p className="mt-2 text-sm text-red-100/90">{ai.error}</p>
            </section>
          )}
          <section className="mt-16 rounded-3xl border border-white/15 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">
              {lang === "fr"
                ? "Comment choisir la bonne raquette de tennis"
                : "How to choose the right tennis racket"}
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-white/75">
              <p>
                {lang === "fr"
                  ? "Whichracket est un outil intelligent de recommandation de raquette et de cordage de tennis. Il aide les joueurs à trouver la configuration la plus adaptée selon leur niveau, leur style de jeu, leurs préférences et leur profil physique."
                  : "Whichracket is a smart tennis racket and string recommendation tool. It helps players find the best setup based on their level, playing style, preferences and physical profile."}
              </p>

              <p>
                {lang === "fr"
                  ? "Choisir la bonne raquette de tennis dépend de plusieurs critères comme le poids, la taille du tamis, le plan de cordage, le confort et le type de jeu recherché. Le questionnaire ci-dessus analyse ces éléments pour proposer des recommandations cohérentes et personnalisées."
                  : "Choosing the right tennis racket depends on several factors such as weight, head size, string pattern, comfort and playing style. The questionnaire above analyzes these factors to suggest personalized and relevant recommendations."}
              </p>

              <p>
                {lang === "fr"
                  ? "Que tu sois débutant, joueur intermédiaire ou compétiteur confirmé, whichracket te permet de trouver plus facilement une raquette et un cordage adaptés à ton jeu."
                  : "Whether you are a beginner, intermediate player or advanced competitor, whichracket helps you more easily find a racket and string setup that fits your game."}
              </p>
            </div>
          </section>

          {data && null}

          <div className="mt-10 space-y-3 text-center text-xs text-white/50">
            <div>
              {t.footer}
            </div>

            <div>
              © 2026 Whichracket. {lang === "fr" ? "Tous droits réservés." : "All rights reserved."}
            </div>

            <div className="flex items-center justify-center gap-4">
              <a href="/legal" className="transition hover:text-white">
                {lang === "fr" ? "Mentions légales" : "Legal notice"}
              </a>
              <span>•</span>
              <a href="/privacy" className="transition hover:text-white">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}