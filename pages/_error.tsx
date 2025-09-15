// pages/_error.tsx
import type { NextPageContext } from "next";

function ErrorPage({ statusCode, message }: { statusCode?: number; message?: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-gray-700 mb-4">
        {statusCode ? `Server responded with status ${statusCode}.` : "A client error occurred."}
      </p>
      {message && <pre className="bg-gray-50 border rounded p-3 text-sm overflow-auto">{message}</pre>}
      <p className="text-sm text-gray-500 mt-4">
        Try a hard refresh. If it persists, check the browser console/network tab or share logs.
      </p>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as any).statusCode : 404;
  const message = err?.message;
  return { statusCode, message };
};

export default ErrorPage;
