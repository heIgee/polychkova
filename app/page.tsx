export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="flex items-center border-b-4 border-line px-6 py-12 md:border-b-0 md:border-r-4 md:px-12 md:py-16 lg:px-20">
          <div className="max-w-2xl">
            <p className="font-body text-sm font-bold uppercase tracking-[0.24em] text-muted">
              Polychkova / tier lists
            </p>
            <h1 className="mt-8 max-w-xl font-display text-[clamp(3.75rem,8vw,7.5rem)] leading-[0.86] tracking-[-0.06em]">
              Rank it.
              <br />
              Share it.
              <br />
              Keep it live.
            </h1>
            <p className="mt-10 max-w-lg font-body text-lg leading-8 text-muted md:text-xl">
              Polychkova is a tier-list app for making rankings, keeping them interactive, and
              sharing them with friends.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="tier-board-title"
          className="flex items-center bg-accent px-6 py-12 md:px-12 md:py-16 lg:px-20"
        >
          <div className="w-full">
            <h2
              id="tier-board-title"
              className="mb-6 max-w-sm font-display text-4xl leading-none tracking-[-0.04em] text-accent-ink md:text-5xl"
            >
              A simple way to rank things.
            </h2>

            <figure className="border-4 border-line bg-panel p-4 shadow-[10px_10px_0_var(--line)] md:p-6">
              <figcaption className="mb-5 font-body text-sm text-muted">
                A small example of the structure.
              </figcaption>
              <div aria-hidden="true" className="grid gap-3">
                <div className="grid grid-cols-[4rem_1fr] gap-3">
                  <div className="flex min-h-20 items-center justify-center bg-accent px-3 py-4 font-display text-3xl text-accent-ink">
                    S
                  </div>
                  <div className="flex min-h-20 items-center gap-3 bg-paper p-3">
                    <span className="h-12 w-12 bg-accent" />
                    <span className="h-12 w-12 bg-ink" />
                    <span className="h-12 w-12 bg-accent" />
                  </div>
                </div>
                <div className="grid grid-cols-[4rem_1fr] gap-3">
                  <div className="flex min-h-20 items-center justify-center bg-paper px-3 py-4 font-display text-3xl text-ink">
                    A
                  </div>
                  <div className="flex min-h-20 items-center gap-3 bg-paper p-3">
                    <span className="h-12 w-12 bg-panel" />
                    <span className="h-12 w-12 bg-accent" />
                  </div>
                </div>
                <div className="grid grid-cols-[4rem_1fr] gap-3">
                  <div className="flex min-h-20 items-center justify-center bg-panel px-3 py-4 font-display text-3xl text-ink">
                    B
                  </div>
                  <div className="flex min-h-20 items-center gap-3 bg-paper p-3">
                    <span className="h-12 w-12 bg-panel" />
                    <span className="h-12 w-12 bg-ink" />
                  </div>
                </div>
              </div>
            </figure>
          </div>
        </section>
      </div>
    </main>
  );
}
