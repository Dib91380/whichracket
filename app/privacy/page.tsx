export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/15 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>

        <div className="mt-6 space-y-4 text-sm leading-7 text-white/80">
          <p>
            whichracket may use privacy-friendly analytics and performance monitoring
            tools in order to understand site usage and improve the experience.
          </p>

          <p>
            No account creation is currently required to use the tool.
          </p>

          <p>
            The information entered in the questionnaire is used only to generate
            racket and string recommendations.
          </p>

          <p>
            Third-party services such as hosting and analytics providers may process
            technical browsing data.
          </p>

          <p>
            For any request regarding privacy, you can contact the site owner.
          </p>
        </div>
      </div>
    </main>
  );
}