import PortfolioPanel from "@/components/PortfolioPanel";

export const metadata = { title: "Portfolio — WallSt v Poly" };

export default function PortfolioPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted">
          Your positions — added manually, via CSV, or imported from a public
          Polymarket wallet — marked to the active feed.
        </p>
      </header>
      <PortfolioPanel />
    </main>
  );
}
