"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import type { Npc } from "@/types";

interface NpcHoverCardProps {
  npc: Npc;
  children: React.ReactNode;
}

export default function NpcHoverCard({ npc, children }: NpcHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-gray-900 border-gray-700 text-gray-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{npc.name}</h4>
            <Badge variant={npc.is_alive ? "secondary" : "destructive"} className="text-xs">
              {npc.is_alive ? "Alive" : "Dead"}
            </Badge>
          </div>
          <p className="text-xs text-gray-400">{npc.race}{npc.npc_class ? ` · ${npc.npc_class}` : ""}</p>
          {npc.personality && (
            <p className="text-xs text-gray-500 line-clamp-2">{npc.personality}</p>
          )}
          {npc.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{npc.description}</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
