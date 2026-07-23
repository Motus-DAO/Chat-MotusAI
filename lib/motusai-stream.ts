/**
 * While MotusAI streams JSON, surface the `response` string as it fills in
 * so the UI can show prose instead of raw JSON braces.
 */
export function extractPartialResponseField(raw: string): string | null {
  const match = /"response"\s*:\s*"/.exec(raw);
  if (!match || match.index === undefined) return null;

  const start = match.index + match[0].length;
  let out = "";

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === undefined) break;
      if (next === "n") out += "\n";
      else if (next === "t") out += "\t";
      else if (next === "r") out += "\r";
      else if (next === '"' || next === "\\" || next === "/") out += next;
      else if (next === "u" && i + 5 < raw.length) {
        const hex = raw.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(Number.parseInt(hex, 16));
          i += 5;
          continue;
        }
        out += next;
      } else {
        out += next;
      }
      i += 1;
      continue;
    }
    if (ch === '"') break;
    out += ch;
  }

  return out;
}
