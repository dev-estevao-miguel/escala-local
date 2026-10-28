export function normalizarWhatsApp(valor: string) {
 let n = valor.replace(/\D/g, '');
 if (n.length === 10 || n.length === 11) n = `55${n}`;
 return /^55[1-9]\d{9,10}$/.test(n) ? `+${n}` : '';
}
export function formatarWhatsApp(valor: string) {
 const n = normalizarWhatsApp(valor).slice(3);
 return n ? `(${n.slice(0,2)}) ${n.slice(2,-4)}-${n.slice(-4)}` : 'Não informado';
}
