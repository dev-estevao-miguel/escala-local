// Leitura de campos de formulário com valores sempre definidos.
export const texto = (f: FormData, campo: string) => String(f.get(campo) ?? '').trim();
export function inteiro(f: FormData, campo: string) {
    const n = Number(f.get(campo));
    return Number.isInteger(n) && n > 0 ? n : 0;
}
export function hora(f: FormData, campo: string) {
    const v = texto(f, campo);
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : '';
}
export const marcado = (f: FormData, campo: string) => f.get(campo) !== null;
