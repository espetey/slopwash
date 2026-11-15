import Link from "next/link";
import Image from "next/image";

export default function BenchmarkPage() {
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
          Slop Benchmark — how models score out of the box
        </p>
        <div className="mt-3 flex items-center justify-center gap-5 text-xs">
          <Link href="/" className="nav-link-haze">
            Home
          </Link>
          <Link href="/scanner" className="nav-link-haze">
            Scanner
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <p className="mt-6 text-sm text-zinc-500 mb-6">
          Each model gets the same set of writing prompts with no system
          instructions. The output is scored with the slopwash analyzer.
          Scores reflect AI pattern density, not writing quality.
        </p>

        <div className="border border-zinc-800 rounded-lg px-4 py-4 bg-zinc-950 mb-6">
          <p className="text-sm text-zinc-300 mb-2">No results published yet.</p>
          <p className="text-sm text-zinc-500">
            An earlier version of this page showed a ranked table of model
            scores marked as placeholder data. The scores were invented, and
            the table is gone. A score appears on this page only when the run
            behind it can be repeated: the prompts, the model settings, and
            the raw outputs are kept with the result, and the analyzer version
            that produced the score is named next to it.
          </p>
        </div>

        <p className="text-sm text-zinc-500 mb-6">
          The first published run will show, for each model: the average
          score across the prompt set, the weakest section, the score on each
          individual prompt, and the analyzer version. Until that run exists,
          the working artifact is the analyzer itself. Run it on any text from
          the <Link href="/scanner" className="text-zinc-300 underline underline-offset-2">scanner</Link>,
          or read the rules it applies on the home page.
        </p>

        <p className="text-xs text-zinc-600 mt-6">
          Methodology: each model receives identical prompts with default
          parameters and no system instructions. Outputs are scored by the
          slopwash heuristic analyzer. Scores reflect AI pattern density, not
          writing quality.
        </p>
      </main>

      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot;{" "}
        <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
        {" "}&middot;{" "}
        <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@slopwash</a>
        {" "}&middot;{" "}
        <a href="/privacy" className="hover:text-zinc-400 transition-colors">Data handling</a>
      </footer>
    </div>
  );
}
