import { sexTypeMeta, orgasmMeta, type SexParticipant } from "@/lib/sex";

// Beteiligte eines Eintrags: je Person Name, Art und Orgasmus.
// Bewusst ohne "use client" – wird sowohl im Server-Verlauf als auch im
// Kalender-Popup (Client) verwendet.
export function ParticipantChips({
  participants,
}: {
  participants: SexParticipant[];
}) {
  if (participants.length === 0) {
    return (
      <span className="text-xs text-black/40 dark:text-white/40">
        Keine Personen erfasst
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {participants.map((p) => {
        const type = sexTypeMeta(p.type);
        const orgasm = orgasmMeta(p.orgasm);
        return (
          <span
            key={p.userId}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 py-0.5 pl-2.5 pr-1 text-xs dark:border-white/15"
          >
            <span className="font-medium">{p.name}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${type.badgeClass}`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${type.dotClass}`}
              />
              {type.label}
            </span>
            <span
              title={orgasm.label}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${orgasm.badgeClass}`}
            >
              <span aria-hidden>{orgasm.symbol}</span>
              {orgasm.short}
            </span>
          </span>
        );
      })}
    </span>
  );
}
