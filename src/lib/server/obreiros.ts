import { normalizarWhatsApp } from '#lib/contato';
import { CARGOS, dataValida, hojeISO } from '#lib/util';
import { executar, todos, transacao, um } from './db';
import { texto, inteiro } from './form';
import { hashSenha } from './senha';
export interface DadosObreiro {
    nascimento: string;
    nome: string;
    carteira: string;
    cargo: string;
    congregacao_id: number;
    whatsapp: string;
    disponibilidade: string[];
}
export function lerDisponibilidade(f: FormData) {
    return f
        .getAll('disp')
        .map(String)
        .filter((v) => /^[0-6]-(manha|tarde|noite)$/.test(v));
}
/** Lê e valida os campos comuns do cadastro de obreiro. A congregação precisa ser da área informada. */
export async function lerObreiro(f: FormData, areaId: number, idAtual = 0, semIgreja = false) {
    const d: DadosObreiro = {
        nascimento: texto(f, 'nascimento'),
        nome: texto(f, 'nome'),
        carteira: texto(f, 'carteira').replace(/\s+/g, ''),
        cargo: texto(f, 'cargo'),
        congregacao_id: inteiro(f, 'congregacao_id'),
        whatsapp: normalizarWhatsApp(texto(f, 'whatsapp')),
        disponibilidade: lerDisponibilidade(f)
    };
    let erro = '';
    if (d.nome.length < 3)
        erro = 'Informe o nome completo.';
    else if (!/^\d{4,20}$/.test(d.carteira))
        erro = 'Informe o número da carteira de membro.';
    else if ((await um('SELECT id FROM usuarios WHERE carteira = ? AND id <> ?', d.carteira, idAtual)))
        erro = 'Já existe um cadastro com este número de carteira.';
    else if (!CARGOS.some((c) => c.nome === d.cargo))
        erro = 'Selecione o cargo.';
    else if (!semIgreja && !(await um('SELECT g.id FROM congregacoes g JOIN areas a ON a.id=g.area_id WHERE g.id = ? AND g.area_id = ? AND (g.habilitada=1 OR a.configurada=0)', d.congregacao_id, areaId)))
        erro = 'Selecione a congregação.';
    else if ((!idAtual || d.nascimento) && (!dataValida(d.nascimento) || d.nascimento >= hojeISO() || d.nascimento < '1900-01-01'))
        erro = 'Informe uma data de nascimento válida.';
    else if (!d.whatsapp)
        erro = 'Informe o WhatsApp com DDD.';
    return { d, erro };
}
export function validarSenha(senha: string, repetida?: string) {
    if (senha.length < 8 || senha.length > 128)
        return 'A senha precisa ter entre 8 e 128 caracteres.';
    if (repetida !== undefined && senha !== repetida)
        return 'As senhas não conferem.';
    return '';
}
export async function salvarDisponibilidade(usuarioId: number, itens: string[]) {
    return transacao(async()=>{
    const area=(await um<{area_id:number|null}>('SELECT area_id FROM usuarios WHERE id=?',usuarioId))?.area_id;
    if(area)await executar('UPDATE areas SET configurada=configurada WHERE id=?',area);
    (await executar('DELETE FROM disponibilidades WHERE usuario_id = ?', usuarioId));
    for (const item of itens) {
        const [dia, turno] = item.split('-');
        (await executar('INSERT INTO disponibilidades (usuario_id, dia_semana, turno) VALUES (?, ?, ?)', usuarioId, Number(dia), turno));
    }
    });
}
export async function disponibilidadeDe(usuarioId: number) {
    return (await todos<{
        dia_semana: number;
        turno: string;
    }>('SELECT dia_semana, turno FROM disponibilidades WHERE usuario_id = ?', usuarioId)).map((r) => `${r.dia_semana}-${r.turno}`);
}
/** Mapa usuario_id → itens de disponibilidade, para listagens. */
export async function disponibilidadesPorUsuario() {
    const mapa = new Map<number, string[]>();
    for (const r of (await todos<{
        usuario_id: number;
        dia_semana: number;
        turno: string;
    }>('SELECT usuario_id, dia_semana, turno FROM disponibilidades'))) {
        mapa.set(r.usuario_id, [...(mapa.get(r.usuario_id) ?? []), `${r.dia_semana}-${r.turno}`]);
    }
    return mapa;
}
/** Novos cadastros por convite já recebem a senha pessoal escolhida pelo usuário. */
export async function criarObreiro(d: DadosObreiro, senha: string, opcoes: {
    status: 'ativo' | 'pendente';
    perfil?: string;
    areaId?: number;
    cadastradoPor: number | null;
    aprovadoPor?: number;
}) {
    return (await transacao(async () => {
        const { id } = (await executar(`INSERT INTO usuarios (nome, carteira, senha_hash, trocar_senha, cargo, perfil, congregacao_id, whatsapp, status, cadastrado_por, aprovado_por, aprovado_em)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? IS NOT NULL THEN datetime('now', 'localtime') END)`, d.nome, d.carteira, hashSenha(senha), 0, d.cargo, opcoes.perfil ?? 'obreiro', d.congregacao_id || null, d.whatsapp, opcoes.status, opcoes.cadastradoPor, opcoes.aprovadoPor ?? null, opcoes.aprovadoPor ?? null));
        (await salvarDisponibilidade(id, d.disponibilidade));
        await executar('UPDATE usuarios SET nascimento = ? WHERE id = ?', d.nascimento || null, id);
        const areaId = opcoes.areaId || (await um<{area_id:number}>('SELECT area_id FROM congregacoes WHERE id=?',d.congregacao_id))?.area_id;
        await executar('UPDATE usuarios SET area_id=? WHERE id=?',areaId || null,id);
        return id;
    }));
}
export const listarCongregacoes = async (areaId: number) => (await todos<{
    id: number;
    codigo: string;
    nome: string;
}>('SELECT g.id,g.codigo,g.nome FROM congregacoes g JOIN areas a ON a.id=g.area_id WHERE g.area_id = ? AND (g.habilitada=1 OR a.configurada=0) ORDER BY g.codigo', areaId));
export const listarAreas = async () => (await todos<{
    id: number;
    codigo: string;
    polo: string;
}>('SELECT id, codigo, polo FROM areas ORDER BY codigo'));
