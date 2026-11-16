import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-8 pb-4 px-6 text-center flex flex-col items-center relative">
        <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="GitHub">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <Link href="/">
          <Image
            src="/slopwash-md.png"
            alt="slopwash"
            width={320}
            height={75}
            className="h-16 sm:h-20 w-auto"
            priority
          />
        </Link>
        <p className="mt-2 text-zinc-400 text-sm">
          Data handling
        </p>
        <div className="mt-3 flex items-center justify-center gap-5 text-xs">
          <Link href="/" className="nav-link-haze">
            Home
          </Link>
          <Link href="/scanner" className="nav-link-haze">
            Scanner
          </Link>
          <Link href="/terms" className="nav-link-haze">
            Terms
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <p className="mt-6 text-sm text-zinc-500 mb-8">
          Slopwash has four paths, and each one handles text differently. This
          page spells out each path. Earlier versions of the site carried a
          single line, &ldquo;processed in memory and never stored,&rdquo; that
          described only the first path. The line has been scoped to where it
          is true.
        </p>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Anonymous scoring (the demo and the public API, no key)
          </h2>
          <p className="text-sm text-zinc-500">
            Text sent for scoring is processed in memory and is not stored.
            The API enforces per-IP rate limits. The full scanner in the
            browser runs the analyzer on your device, and the text never
            leaves it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Hosted rewrite
          </h2>
          <p className="text-sm text-zinc-500">
            The rewrite demo sends your text to Anthropic for processing, and
            the rewrite comes back the same way. Anthropic handles the text
            under its API terms. Slopwash does not store the text or the
            rewrite from an anonymous rewrite call.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Keyed API calls
          </h2>
          <p className="text-sm text-zinc-500">
            Calls made with an API key are metered: the key, the endpoint, and
            usage counts are recorded. The draft and the rewrite from a keyed
            call are kept as an evaluation triple, the input the analyzer
            improves from, only when the key has opted in. The default is
            that nothing is kept. Opting in is a per-key setting, applied
            when the key is issued or on request at any time. Triples that
            are stored are purged after 90 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Org checks, exemplars, and corpora
          </h2>
          <p className="text-sm text-zinc-500">
            A check run against an org spec stores a SHA-256 hash of the text
            and a summary of the result. The text itself is not stored.
            Exemplars and corpus pieces are stored as text, because the
            analysis runs over the set, and an org sets the retention period
            for its own material: 365 days by default, and it can be set to 0,
            which deletes the stored pieces while run records remain.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Site analytics
          </h2>
          <p className="text-sm text-zinc-500">
            This site runs Vercel Analytics, which reports aggregate visit
            counts and the handful of product events named in the code (a scan
            completed, a rewrite completed, an offer link clicked). There are
            no advertising trackers, no cross-site profiles, and no sale of
            data. An earlier footer line read &ldquo;no tracking&rdquo;; it
            was broader than the fact and has been corrected.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            What a score means
          </h2>
          <p className="text-sm text-zinc-500">
            Slopwash evaluates writing patterns. A score does not determine
            whether a human or an AI wrote a text, and a higher score does not
            guarantee better writing.
          </p>
        </section>

        <p className="text-sm text-zinc-500">
          Questions about data handling go to{" "}
          <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2">@slopwash</a>{" "}
          on X.
        </p>
      </main>

      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot;{" "}
        <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
        {" "}&middot;{" "}
        <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@slopwash</a>
        {" "}&middot;{" "}
        <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
      </footer>
    </div>
  );
}
