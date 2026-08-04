// Tabela oficial de horas por Modelo / Porte / Etapa
export type Modelo = "Manufatura Enxuta" | "Eficiência Energética" | "Alvo";
export type Porte = "ME" | "EPP";
export type Etapa = "T0" | "T1" | "T2" | "T3" | "T4";

export const ETAPAS: Etapa[] = ["T0", "T1", "T2", "T3", "T4"];

export const MODELOS: Modelo[] = ["Manufatura Enxuta", "Eficiência Energética", "Alvo"];

export const TABELA_HORAS: Record<Modelo, Record<Porte, Record<Etapa, number>>> = {
  "Manufatura Enxuta": {
    ME:  { T0: 4, T1: 16, T2: 40, T3: 16, T4: 4 },
    EPP: { T0: 4, T1: 16, T2: 56, T3: 18, T4: 16 },
  },
  "Eficiência Energética": {
    ME:  { T0: 4, T1: 6, T2: 46, T3: 16, T4: 8 },
    EPP: { T0: 4, T1: 6, T2: 62, T3: 30, T4: 8 },
  },
  // Modelo Alvo: duas etapas de 2h cada, independente do porte da empresa.
  "Alvo": {
    ME:  { T0: 2, T1: 2, T2: 0, T3: 0, T4: 0 },
    EPP: { T0: 2, T1: 2, T2: 0, T3: 0, T4: 0 },
  },
};

export const MAX_HORAS_DIA = 8;

/** Horários fixos de atendimento do modelo Alvo. */
export const HORARIOS_ATENDIMENTO = ["08:00", "10:00", "12:00", "14:00"];

/** Máximo de clientes distintos que um consultor pode atender no mesmo dia (modelos por horário). */
export const MAX_ATENDIMENTOS_DIA_CONSULTOR = HORARIOS_ATENDIMENTO.length;

/** Modelos que trabalham com horários fixos no dia (em vez de dia inteiro). */
export function modeloUsaHorarios(modelo: string | null | undefined): boolean {
  return modelo === "Alvo";
}

/** Modelos que não diferenciam ME/EPP. */
export function modeloValidaPorte(modelo: string | null | undefined): boolean {
  return modelo !== "Alvo";
}

/** Etapas disponíveis por modelo. */
export function etapasDoModelo(modelo: string | null | undefined): Etapa[] {
  return modelo === "Alvo" ? ["T0", "T1"] : ETAPAS;
}

export function horasPorEtapa(modelo: Modelo | string | null | undefined, porte: Porte | string | null | undefined, etapa: Etapa): number {
  const m = TABELA_HORAS[(modelo as Modelo)];
  if (!m) return 0;
  const p = m[(porte as Porte)] ?? m.ME;
  return p[etapa] ?? 0;
}


export function totalHoras(modelo: string | null | undefined, porte: string | null | undefined, etapasSelecionadas: Etapa[]): number {
  return etapasSelecionadas.reduce((s, e) => s + horasPorEtapa(modelo, porte, e), 0);
}

/**
 * Divide o total em blocos de até 8h; sobras ficam no último bloco.
 * Ex.: 20 -> [8,8,4]; 46 -> [8,8,8,8,8,6]
 */
export function distribuirEmBlocos(totalHoras: number, max = MAX_HORAS_DIA): number[] {
  const t = Math.max(0, Number(totalHoras) || 0);
  if (t === 0) return [];
  const cheios = Math.floor(t / max);
  const resto = +(t - cheios * max).toFixed(2);
  const blocos = Array(cheios).fill(max);
  if (resto > 0) blocos.push(resto);
  return blocos;
}

/**
 * Blocos por etapa selecionada, preservando a etapa de origem de cada bloco.
 */
export function blocosPorEtapa(
  modelo: string | null | undefined,
  porte: string | null | undefined,
  etapas: Etapa[],
): { etapa: Etapa; horas: number }[] {
  const out: { etapa: Etapa; horas: number }[] = [];
  for (const e of etapas) {
    const h = horasPorEtapa(modelo, porte, e);
    for (const b of distribuirEmBlocos(h)) out.push({ etapa: e, horas: b });
  }
  return out;
}

// ----- Datas úteis -----

export function isFimDeSemana(d: Date) {
  const g = d.getDay();
  return g === 0 || g === 6;
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function proximoDiaUtil(d: Date, feriados: Set<string> = new Set()): Date {
  const x = new Date(d);
  while (isFimDeSemana(x) || feriados.has(toISO(x))) x.setDate(x.getDate() + 1);
  return x;
}

export function proximoAposDiaUtil(d: Date, feriados: Set<string> = new Set()): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return proximoDiaUtil(x, feriados);
}

export function gerarDatas(inicio: Date, quantidade: number, feriados: Set<string> = new Set()): string[] {
  const out: string[] = [];
  let cur = proximoDiaUtil(inicio, feriados);
  for (let i = 0; i < quantidade; i++) {
    out.push(toISO(cur));
    cur = proximoAposDiaUtil(cur, feriados);
  }
  return out;
}

export { toISO };
