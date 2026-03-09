import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-4xl font-bold">DM Co-Pilot</h1>
      <p className="text-gray-600 text-lg">
        Your digital Dungeon Master assistant
      </p>
      <Link
        href="/campaigns"
        className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
      >
        View Campaigns
      </Link>
    </div>
  );
}
