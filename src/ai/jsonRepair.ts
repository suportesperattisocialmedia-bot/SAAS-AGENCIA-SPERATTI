/**
 * Conserta os defeitos mais comuns de um JSON copiado de uma IA de chat:
 * quebras de linha dentro do texto, aspas internas sem escape, vírgulas
 * faltando ou sobrando e linhas cortadas (texto que termina sem fechar aspas,
 * como acontece quando a interface da IA ou a área de transferência corta
 * linhas longas). Não completa JSON cortado no final: isso continua sendo erro,
 * porque faltariam seções inteiras.
 */

export interface RepairResult {
  text: string;
  /** Quantos textos terminavam sem fechar aspas e foram fechados aqui. */
  closedLines: number;
}

const STRUCTURE_AFTER_BREAK = /^(?:"[^"\n]*"\s*:|[}\]]|")/;

function nextNonSpace(src: string, from: number): { ch: string | undefined; crossedLine: boolean } {
  let crossedLine = false;
  for (let j = from; j < src.length; j++) {
    const c = src[j];
    if (c === '\n' || c === '\r') crossedLine = true;
    else if (c !== ' ' && c !== '\t') return { ch: c, crossedLine };
  }
  return { ch: undefined, crossedLine };
}

export function repairJson(src: string): RepairResult {
  let out = '';
  let inString = false;
  let escaped = false;
  let closedLines = 0;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      const { ch: next, crossedLine } = nextNonSpace(src, i + 1);
      const closes = next === undefined || next === ',' || next === '}' || next === ']' || next === ':' || (next === '"' && crossedLine);
      if (closes) {
        inString = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      const rest = src.slice(i + 1).trimStart();
      if (STRUCTURE_AFTER_BREAK.test(rest)) {
        // A linha acabou sem fechar aspas e a próxima já é estrutura do JSON.
        out = out.replace(/[ \t]+$/, '') + '"';
        inString = false;
        closedLines++;
        out += ch;
      } else if (ch === '\n') {
        out += '\\n';
      }
      continue;
    }
    if (ch === '\t') {
      out += '\\t';
      continue;
    }
    if (ch < ' ') continue;
    out += ch;
  }

  // Fora das strings agora só existem quebras de linha estruturais.
  const text = out
    .replace(/("|\}|\]|\d|true|false|null)(\s*\n\s*)(?=["{[])/g, '$1,$2')
    .replace(/,(\s*[}\]])/g, '$1');
  return { text, closedLines };
}
