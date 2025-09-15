// pages/insight.tsx
export default function Insight() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">AI Insight</h1>
      <p className="text-sm text-gray-600">
        Insights are generated after you run the <strong>Dashboard</strong> with a GA4 property and/or a GSC site and a date range.
        This route exists so the nav link works. Once data is fetched on Dashboard, you can surface summaries there.
      </p>
    </div>
  );
}
