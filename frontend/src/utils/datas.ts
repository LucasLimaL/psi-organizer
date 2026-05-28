export function inicioDaSemana(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const diaSemana = r.getDay() // 0=dom .. 6=sáb
  const offset = diaSemana === 0 ? -6 : 1 - diaSemana
  r.setDate(r.getDate() + offset)
  return r
}

export function addDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function mesmaData(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
}

export function formatarHora(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarData(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatarDataLonga(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// Para input type="datetime-local" — formato local sem timezone
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocal(s: string): Date {
  return new Date(s)
}

export function primeiroDiaUtilDoMes(ano: number, mes: number): Date {
  const d = new Date(ano, mes, 1)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

export function formatarMes(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
