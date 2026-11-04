import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">
        The link may be outdated. If you are reporting an emergency, call 113 /
        114 / 115 first.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-[#0b2545] px-4 py-2 font-semibold text-white"
      >
        Go home
      </Link>
    </div>
  );
}
