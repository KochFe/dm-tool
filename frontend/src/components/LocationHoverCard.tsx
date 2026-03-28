"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import type { Location } from "@/types";

interface LocationHoverCardProps {
  location: Location;
  isCurrent?: boolean;
  children: React.ReactNode;
}

export default function LocationHoverCard({ location, isCurrent, children }: LocationHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-gray-900 border-gray-700 text-gray-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{location.name}</h4>
            <Badge variant="secondary" className="text-xs capitalize">{location.biome}</Badge>
            {isCurrent && <Badge className="text-xs bg-amber-600/20 text-amber-400">Current</Badge>}
          </div>
          {location.description && (
            <p className="text-xs text-gray-500 line-clamp-3">{location.description}</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
