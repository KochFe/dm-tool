import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
      <div className="space-y-3">
        <h1 className="text-5xl font-bold text-gray-100 tracking-tight">
          DM Co-Pilot
        </h1>
        <p className="text-amber-400 text-lg font-medium tracking-widest uppercase text-sm">
          Dungeon Master Assistant
        </p>
        <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed">
          Manage your campaigns, track initiative, roll dice, and keep your
          party on course — all at the table.
        </p>
      </div>
      <Link
        href="/campaigns"
        className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-semibold px-8 py-3 rounded-lg transition-colors duration-150 text-base"
      >
        View Campaigns
      </Link>
    </div>
  );
}
