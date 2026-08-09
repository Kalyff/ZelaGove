/** "05 ago" — formato dos cards da lista (requisito 3.1.2). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(d)
    .replace('.', '');
  return `${day} ${month}`;
}

/** "05/08 14:30" — formato da timeline (requisito 3.1.5). */
export function timelineDate(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${date} ${time}`;
}

export function coords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(' ')[0];
}
