import type { PhasePrepResult } from "@/lib/api";

/**
 * Read-only preview of a PhasePrepResult rendered inside the AIAssistModal,
 * shown BEFORE the user accepts the generation. After acceptance, the real
 * rendering is whatever TipTap produces from phasePrepToTiptap(result).
 */
export function PhasePrepPreview({ result }: { result: PhasePrepResult }) {
  return (
    <div className="space-y-4">
      {result.sections.map((section, idx) => (
        <div key={idx} className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            {section.heading}
          </h4>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            {section.bullets.map((bullet, bi) => (
              <li key={bi}>{bullet}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
