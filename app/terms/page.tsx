import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
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
          Terms
        </p>
        <div className="mt-3 flex items-center justify-center gap-5 text-xs">
          <Link href="/" className="nav-link-haze">
            Home
          </Link>
          <Link href="/scanner" className="nav-link-haze">
            Scanner
          </Link>
          <Link href="/privacy" className="nav-link-haze">
            Data handling
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <section className="mt-6 mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            What the scores mean
          </h2>
          <p className="text-sm text-zinc-500">
            Slopwash scores measure how densely a text matches the patterns in
            a published standard for AI-assisted writing. A score does not
            determine whether a human or an AI wrote the text, and it is not a
            judgment of the writing as a whole. Findings are editorial input.
            The decision to publish stays with the editor.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            The free tools
          </h2>
          <p className="text-sm text-zinc-500">
            The scanner, the demo, the prompt, and the public MCP endpoint are
            provided as-is, with rate limits, and they may change. The ruleset
            and the analyzer carry version numbers, and a result names the
            versions that produced it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Audits and pilots
          </h2>
          <p className="text-sm text-zinc-500">
            An audit is a written report on a document set agreed in advance,
            delivered at the stated price. Findings name passages and
            patterns; an audit is not a guarantee of any outcome with readers,
            platforms, or detectors. Team pilots are set up directly, billed
            monthly, and can be ended by either side at the end of a billing
            month.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            API keys
          </h2>
          <p className="text-sm text-zinc-500">
            Keys are issued to a named holder, carry the tier and scopes set at
            issue, and can be revoked for use that breaks the stated rate
            limits or for resale of access. Draft and rewrite text from a
            keyed call is kept only when the key has opted in to evaluation
            storage; by default nothing is kept. Data handling for keyed
            calls is described on the{" "}
            <Link href="/privacy" className="text-zinc-300 underline underline-offset-2">data handling page</Link>.
          </p>
        </section>

        <p className="text-sm text-zinc-500">
          Questions go to{" "}
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
        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Data handling</Link>
      </footer>
    </div>
  );
}
