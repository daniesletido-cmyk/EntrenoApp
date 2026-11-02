import fs from "fs";

const file = "src/components/workout-detail-modal.tsx";
let content = fs.readFileSync(file, "utf8");

const oldBlock = `                  {/* Callout de Psicología Deportiva en Detalle */}
                  {(() => {
                    const psychoMatch = (session.notes || "").match(/- Enfoque Psicológico & Tip Mental:\\s*([^\\n]+)/i);
                    if (!psychoMatch) return null;
                    return (
                      <div
                        className="surface-raised"
                        style={{
                          padding: "var(--space-4)",
                          marginBottom: "var(--space-3)",
                          borderLeft: "4px solid #a855f7",
                          backgroundColor: "rgba(139, 92, 246, 0.08)",
                          borderTop: "1px solid rgba(139, 92, 246, 0.2)",
                          borderRight: "1px solid rgba(139, 92, 246, 0.2)",
                          borderBottom: "1px solid rgba(139, 92, 246, 0.2)",
                        }}
                      >
                        <div className="text-xs font-semibold uppercase text-purple-400 flex items-center gap-1.5" style={{ marginBottom: "var(--space-2)" }}>
                          <Brain size={15} className="text-purple-400" />
                          <span>Psicología Deportiva & Foco Mental</span>
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          {psychoMatch[1]}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="text-xs font-semibold uppercase text-muted flex items-center gap-1.5" style={{ marginBottom: "var(--space-2)" }}>
                      <FileText size={13} style={{ color: "var(--color-brand)" }} />
                      <span>Pauta Planificada y Notas de Ejecución</span>
                    </div>
                    {session.notes ? (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: "var(--text-sm)",
                          lineHeight: 1.6,
                          color: "var(--color-text)",
                          backgroundColor: "rgba(0,0,0,0.25)",
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {session.notes}
                      </div>`;

const newBlock = `                  {/* Callout de Psicología Deportiva en Detalle */}
                  {(() => {
                    const psychoMatch = (session.notes || "").match(/- Enfoque Psicológico & Tip Mental:\\s*([^\\n]+)/i);
                    if (!psychoMatch) return null;
                    const rawTip = psychoMatch[1].trim();
                    const colonIdx = rawTip.indexOf(":");
                    const tipTitle = colonIdx > -1 ? rawTip.slice(0, colonIdx).trim() : null;
                    const tipBody = colonIdx > -1 ? rawTip.slice(colonIdx + 1).trim() : rawTip;

                    return (
                      <div
                        className="surface-raised"
                        style={{
                          padding: "var(--space-4)",
                          marginBottom: "var(--space-3)",
                          borderLeft: "4px solid #a855f7",
                          backgroundColor: "rgba(147, 51, 234, 0.08)",
                          borderTop: "1px solid rgba(168, 85, 247, 0.3)",
                          borderRight: "1px solid rgba(168, 85, 247, 0.3)",
                          borderBottom: "1px solid rgba(168, 85, 247, 0.3)",
                          borderRadius: "var(--radius-md)",
                        }}
                      >
                        <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-2)" }}>
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "rgba(168, 85, 247, 0.2)" }}
                          >
                            <Brain size={16} className="text-purple-400" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                            Psicología Deportiva & Foco Mental
                          </span>
                        </div>
                        {tipTitle && (
                          <div
                            className="font-bold text-foreground"
                            style={{
                              fontSize: "var(--text-base)",
                              marginBottom: "var(--space-1)",
                              lineHeight: 1.4,
                            }}
                          >
                            {tipTitle}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            lineHeight: 1.65,
                            color: "var(--color-text)",
                            opacity: 0.92,
                          }}
                        >
                          {tipBody}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="text-xs font-semibold uppercase text-muted flex items-center gap-1.5" style={{ marginBottom: "var(--space-2)" }}>
                      <FileText size={13} style={{ color: "var(--color-brand)" }} />
                      <span>Pauta Planificada y Notas de Ejecución</span>
                    </div>
                    {session.notes ? (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: "var(--text-sm)",
                          lineHeight: 1.6,
                          color: "var(--color-text)",
                          backgroundColor: "rgba(0,0,0,0.25)",
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {session.notes
                          .split("\\n")
                          .filter((l) => !l.includes("- Enfoque Psicológico & Tip Mental:"))
                          .join("\\n")
                          .trim()}
                      </div>`;

const normalizedContent = content.replace(/\r\n/g, "\n");
const normalizedOld = oldBlock.replace(/\r\n/g, "\n");
const normalizedNew = newBlock.replace(/\r\n/g, "\n");

if (!normalizedContent.includes(normalizedOld)) {
  console.error("Old block not found!");
  process.exit(1);
}

const updated = normalizedContent.replace(normalizedOld, normalizedNew);
fs.writeFileSync(file, updated, "utf8");
console.log("Successfully patched workout-detail-modal.tsx!");
