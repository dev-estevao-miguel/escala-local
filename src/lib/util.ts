// Funções e constantes usadas tanto no servidor quanto nas páginas.
export const IGREJA = 'Igreja Evangélica Demo';
export const SIGLA = 'DEMO';
export const DESENVOLVEDOR = 'Estevão Miguel dos Santos';
export const VERSAO = '1.20.3';
export const DIAS_SEMANA = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
/** Semana começa na segunda, como na escala. */
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
export const TURNOS = [
    { id: 'manha', nome: 'Manhã', letra: 'M' },
    { id: 'tarde', nome: 'Tarde', letra: 'T' },
    { id: 'noite', nome: 'Noite', letra: 'N' }
] as const;
export type Turno = (typeof TURNOS)[number]['id'];
export const CARGOS = [
    { nome: 'Pastor', abrev: 'Pr.' },
    { nome: 'Evangelista', abrev: 'Ev.' },
    { nome: 'Presbítero', abrev: 'Pb.' },
    { nome: 'Diácono', abrev: 'Dc.' },
    { nome: 'Auxiliar Oficial', abrev: 'Aux. Of.' },
    { nome: 'Auxiliar Local', abrev: 'Aux. Loc.' }
];
/**
 * Hierarquia:
 * - Admin da plataforma: acompanha o funcionamento (falhas, acessos, banco) e administra todas as áreas;
 * - Coordenador / Vice: tudo da área que coordena;
 * - Pb responsável: só a própria igreja e os obreiros dela;
 * - Obreiro: vê a escala da área e baixa o PDF, sem editar (só confirma ou justifica as próprias escalas).
 */
export const PERFIS = {
    admin: 'Admin da plataforma',
    coordenador: 'Coordenador da área',
    vice: 'Vice-coordenador da área',
    pb: 'Responsável pela igreja',
    obreiro: 'Obreiro'
} as const;
export type Perfil = keyof typeof PERFIS;
export const STATUS_OBREIRO = {
    removido: { rotulo: 'Removido', cor: 'bg-gray-200 text-gray-700' },
    pendente: { rotulo: 'Aguardando autorização', cor: 'bg-amber-100 text-amber-800' },
    ativo: { rotulo: 'Ativo', cor: 'bg-green-100 text-green-800' },
    recusado: { rotulo: 'Recusado', cor: 'bg-red-100 text-red-700' },
    inativo: { rotulo: 'Inativo', cor: 'bg-gray-200 text-gray-700' }
} as const;
export type StatusObreiro = keyof typeof STATUS_OBREIRO;
export const RESPOSTAS = {
    pendente: { rotulo: 'Pendente', cor: 'bg-amber-100 text-amber-800' },
    confirmado: { rotulo: 'Confirmado', cor: 'bg-green-100 text-green-800' },
    justificado: { rotulo: 'Justificado', cor: 'bg-red-100 text-red-700' }
} as const;
export type Resposta = keyof typeof RESPOSTAS;
export interface Area {
    id: number;
    codigo: string;
    polo: string;
}
export interface Usuario {
    foto_versao?: number;
    pode_definir_area: number;
    gerencia_escala: number;
    id: number;
    nome: string;
    carteira: string;
    cargo: string;
    perfil: Perfil;
    congregacao_id: number;
    congregacao: string;
    area_id: number;
    /** 1 enquanto o usuário precisa substituir a senha temporária. */
    trocar_senha: number;
}
export const nomeArea = (a: {
    codigo: string;
    polo: string;
}) => `Área ${a.codigo} · Polo ${a.polo}`;
// ---------- permissões ----------
// Cada usuário trabalha na área da sua congregação. Só o Admin da plataforma troca de área.
export const ehAdminGeral = (u: Usuario | null) => !!u && u.perfil === 'admin';
/** Coordenação: administrador geral, coordenador ou vice. */
export const ehAdmin = (u: Usuario | null) => !!u && (u.perfil === 'coordenador' || u.perfil === 'vice');
export const ehPb = (u: Usuario | null) => !!u && u.perfil === 'pb';
export const podeCadastrarObreiro = (u: Usuario | null) => ehAdmin(u) || ehPb(u);
/** O Pb só enxerga a própria igreja; os demais perfis, a área inteira (null). */
export const igrejaRestrita = (u: Usuario | null) => (u && ['pb','obreiro'].includes(u.perfil) ? u.congregacao_id : null);
/** Coordenador e vice gerem só a própria área; o administrador geral, todas. */
export const podeGerirArea = (u: Usuario | null, areaId: number) => areaId > 0 && (ehAdmin(u) && u!.area_id === areaId);
/** Coordenação da área edita qualquer congregação dela; o Pb, apenas a sua. */
export const podeGerirCongregacao = (u: Usuario | null, c: {
    id: number;
    area_id: number;
}) => podeGerirArea(u, c.area_id) || (ehPb(u) && u!.congregacao_id === c.id);
/** Perfis que o usuário pode atribuir a outros. */
export function perfisAtribuiveis(u: Usuario | null): Perfil[] {
    if (ehAdminGeral(u))
        return ['coordenador', 'vice', 'pb', 'obreiro'];
    if (ehAdmin(u))
        return ['vice', 'pb', 'obreiro'];
    return ['obreiro'];
}
/** A delegação permite apenas montar escalas na área; não concede gestão de pessoas. */
export const podeMontarEscala = (u: Usuario | null, areaId: number) =>
    podeGerirArea(u, areaId) || (!!u?.gerencia_escala && u.area_id === areaId);
// ---------- regra da quarta-feira ----------
/** Quarta-feira: nos cultos do templo, o escalado principal é sempre o Pb responsável pela congregação. */
export const DIA_DO_PB = 3;
/** Culto do templo numa quarta-feira (pontos de pregação seguem a escala normal). */
export const ehCultoDoPb = (c: {
    data: string;
    ponto_id: number | null;
}) => diaSemana(c.data) === DIA_DO_PB && c.ponto_id === null;
/**
 * Função de quem está na escala:
 * - escalado: escala normal;
 * - titular: o Pb responsável nos cultos de quarta (colocado automaticamente);
 * - auxiliar: obreiro encaminhado pelo próprio Pb para auxiliá-lo na quarta (não sai na escala publicada).
 */
export type Funcao = 'escalado' | 'titular' | 'auxiliar';
// ---------- cargo exigido por tipo de culto ----------
/**
 * Elegibilidade ministerial para os cultos locais:
 * - Pastor, Evangelista e Presbítero: qualquer culto;
 * - Diácono: todos, menos Santa Ceia;
 * - Auxiliar Oficial e Auxiliar Local: todos, menos Santa Ceia e Doutrina.
 * Os demais cultos aceitam qualquer obreiro.
 */
const CARGOS_EXIGIDOS: Record<string, string[]> = {
    'santa ceia': ['Pastor', 'Evangelista', 'Presbítero'],
    doutrina: ['Pastor', 'Evangelista', 'Presbítero', 'Diácono']
};
const exigencia = (tipo: string) => CARGOS_EXIGIDOS[tipo.trim().toLowerCase()];
export const cargoPermitido = (tipo: string, cargo: string) => !exigencia(tipo) || exigencia(tipo).includes(cargo);
/** Quem pode ser escalado no culto, por extenso. */
export function quemPodeSerEscalado(tipo: string) {
    const cargos = exigencia(tipo);
    if (!cargos)
        return 'Qualquer obreiro';
    return cargos.length > 1 ? `${cargos.slice(0, -1).join(', ')} ou ${cargos.at(-1)}` : cargos[0];
}
/** Mensagem da restrição do culto, ou null quando qualquer cargo pode ser escalado. */
export const avisoDoCargo = (tipo: string) => exigencia(tipo) ? `${tipo}: somente ${quemPodeSerEscalado(tipo)} podem ser escalados.` : null;
// ---------- datas (sempre 'AAAA-MM-DD', no fuso local) ----------
export function paraISO(d: Date) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dia}`;
}
export const hojeISO = () => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
export function paraData(iso: string) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
}
export function dataValida(v: string | null | undefined): v is string {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v))
        return false;
    return paraISO(paraData(v)) === v;
}
export function somarDias(iso: string, dias: number) {
    const d = paraData(iso);
    d.setDate(d.getDate() + dias);
    return paraISO(d);
}
export const diaSemana = (iso: string) => paraData(iso).getDay();
/** 1ª, 2ª... ocorrência daquele dia da semana no mês. */
export const semanaDoMes = (iso: string) => Math.ceil(paraData(iso).getDate() / 7);
export function segundaDaSemana(iso: string) {
    return somarDias(iso, -((diaSemana(iso) + 6) % 7));
}
export function formatarData(iso: string) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}
export function formatarDataLonga(iso: string) {
    return `${DIAS_SEMANA[diaSemana(iso)]}, ${formatarData(iso)}`;
}
function hora(h: string) {
    const [hh, mm] = h.split(':');
    return mm === '00' ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
}
export const horario = (inicio: string, fim: string) => `${hora(inicio)} às ${hora(fim)}`;
export function turnoDoHorario(h: string): Turno {
    const hh = Number(h.slice(0, 2));
    return hh < 12 ? 'manha' : hh < 18 ? 'tarde' : 'noite';
}
// ---------- textos ----------
export const nomeNaEscala = (u:{nome:string;cargo:string}) => `${abrevCargo(u.cargo)} ${u.nome}`.trim();
export const nomeNaSaudacao = (u:{nome:string;cargo:string;perfil:Perfil}) => `${u.perfil==='coordenador'?'Coord.':u.perfil==='vice'?'Vic. Coord.':abrevCargo(u.cargo)} ${u.nome}`.trim();
export const saudacao = (u:{nome:string;cargo:string;perfil:Perfil}) => `A Paz do Senhor, ${nomeNaSaudacao(u)}`;
export function abrevCargo(cargo: string) {
    return CARGOS.find((c) => c.nome === cargo)?.abrev ?? cargo;
}
/** "Seg N · Qua N · Dom M N" a partir de ['1-noite', '3-noite', '0-manha', ...] */
export function resumoDisponibilidade(itens: string[]) {
    const partes = ORDEM_SEMANA.map((d) => {
        const letras = TURNOS.filter((t) => itens.includes(`${d}-${t.id}`)).map((t) => t.letra);
        return letras.length ? `${DIAS_CURTOS[d]} ${letras.join(' ')}` : '';
    }).filter(Boolean);
    return partes.length ? partes.join(' · ') : 'Sem disponibilidade informada';
}
export function descreverRegra(r: {
    dia_semana: number;
    semana_mes: number | null;
}) {
    const dia = DIAS_SEMANA[r.dia_semana].toLowerCase();
    const masculino = r.dia_semana === 0 || r.dia_semana === 6;
    if (r.semana_mes)
        return `${r.semana_mes}${masculino ? 'º' : 'ª'} ${dia} do mês`;
    return `${masculino ? 'Todo' : 'Toda'} ${dia}`;
}
export interface DadosEscala {
    data: string;
    hora_inicio: string;
    hora_fim: string;
    area: string;
    congregacao: string;
    ponto: string | null;
    tipo: string;
    tema: string;
}
export const localDoCulto = (e: {
    ponto: string | null;
}) => e.ponto ?? 'Templo da congregação';
export function textoEscala(e: DadosEscala & {
    funcao?: Funcao;
}, escalado: {
    nome: string;
    cargo: string;
}) {
    const funcao = e.funcao === 'auxiliar' ? 'Auxiliando o Pb responsável' : e.funcao === 'titular' ? 'Pb responsável (quarta-feira)' : '';
    return [
        `*Escala no dia ${formatarData(e.data)}* (${DIAS_SEMANA[diaSemana(e.data)].toLowerCase()})`,
        `Horário: ${horario(e.hora_inicio, e.hora_fim)}`,
        `Igreja: ${e.congregacao} – Área ${e.area}`,
        `Localização: ${localDoCulto(e)}`,
        `Culto: ${e.tipo}`,
        `Tema indicado: ${e.tema || 'Livre'}`,
        `Escalado: ${nomeNaEscala(escalado)}`,
        ...(funcao ? [`Função: ${funcao}`] : [])
    ].join('\n');
}
export function linkWhatsApp(texto: string, numero = '') {
    const destino = numero.replace(/\D/g, '');
    const fone = destino && !destino.startsWith('55') ? `55${destino}` : destino;
    return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
}
