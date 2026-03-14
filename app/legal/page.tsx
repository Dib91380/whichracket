export default function LegalPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/15 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <h1 className="text-3xl font-semibold">Mentions légales</h1>

        <div className="mt-6 space-y-4 text-sm leading-7 text-white/80">
          <p>
            <strong>Site :</strong> Whichracket
          </p>

          <p>
            <strong>Responsable de publication :</strong> Nicolas Dib
          </p>

          <p>
            Whichracket est un projet personnel expérimental permettant de proposer
            des recommandations de raquettes et cordages de tennis selon le profil
            du joueur.
          </p>

          <p>
            Ce site n’est affilié à aucune marque, fabricant ou distributeur de matériel de tennis.
          </p>

          <p>
            <strong>Hébergement :</strong> Vercel Inc.
          </p>
        </div>
      </div>
    </main>
  );
}