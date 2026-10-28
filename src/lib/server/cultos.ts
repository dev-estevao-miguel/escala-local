import { abrevCargo, cargoPermitido, diaSemana, hojeISO, semanaDoMes, turnoDoHorario, type Funcao } from '#lib/util';
import { executar, todos, transacao, um } from './db';
interface Regra {
    id: number;
    congregacao_id: number;
    ponto_id: number | null;
    tipo_culto_id: number;
    semana_mes: number | null;
    hora_inicio: string;
    hora_fim: string;
}
const sobrepoe = (a: {
    hora_inicio: string;
    hora_fim: string;
}, b: {
    hora_inicio: string;
    hora_fim: string;
}) => a.hora_inicio < b.hora_fim && b.hora_inicio < a.hora_fim;
/**
 * Cria (uma única vez) os cultos do dia a partir da agenda fixa.
 * Um culto mensal (ex.: Santa Ceia na 2ª terça) substitui o culto semanal
 * do mesmo local que acontece no mesmo horário (ex.: Doutrina de terça).
 */
export async function garantirCultos(data: string, areaId: number) {
    const regras = (await todos<Regra>(`SELECT a.* FROM agenda a
		 JOIN congregacoes g ON g.id = a.congregacao_id
		 LEFT JOIN pontos_pregacao p ON p.id = a.ponto_id
		 JOIN tipos_culto t ON t.id = a.tipo_culto_id
		 WHERE g.habilitada=1 AND g.area_id = ? AND a.dia_semana = ? AND (a.semana_mes IS NULL OR a.semana_mes = ?)
		   AND (a.ponto_id IS NULL OR p.ativo = 1) AND t.ativo = 1`, areaId, diaSemana(data), semanaDoMes(data)));
    const mensais = regras.filter((r) => r.semana_mes !== null);
    const valem = regras.filter((r) => r.semana_mes !== null ||
        !mensais.some((m) => m.congregacao_id === r.congregacao_id && m.ponto_id === r.ponto_id && sobrepoe(m, r)));
    const inserir = (`INSERT OR IGNORE INTO cultos (data, congregacao_id, ponto_id, tipo_culto_id, hora_inicio, hora_fim, agenda_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`);
    (await transacao(async () => {
        for (const r of valem) {
            (await executar(inserir, data, r.congregacao_id, r.ponto_id, r.tipo_culto_id, r.hora_inicio, r.hora_fim, r.id));
        }
    }));
}
/**
 * Após mudar a agenda de uma congregação, remove os cultos futuros gerados
 * automaticamente que ainda não foram mexidos, para serem gerados de novo.
 */
export async function regerarCultosFuturos(congregacaoId: number) {
    (await executar(`DELETE FROM cultos
		 WHERE congregacao_id = ? AND data >= ? AND agenda_id IS NOT NULL
		   AND cancelado = 0 AND tema = '' AND observacao = ''
		   AND NOT EXISTS (SELECT 1 FROM escalas e WHERE e.culto_id = cultos.id AND e.funcao <> 'titular')`, congregacaoId, hojeISO()));
}
export interface CultoDoDia {
    id: number;
    data: string;
    congregacao_id: number;
    area_id: number;
    ponto_id: number | null;
    hora_inicio: string;
    hora_fim: string;
    tema: string;
    observacao: string;
    cancelado: number;
    tipo: string;
    codigo_cc: string;
    nome_evento:string;
    area: string;
    congregacao: string;
    codigo: string;
    ponto: string | null;
    endereco: string;
    maps: string;
}
export async function cultosDoDia(data: string, areaId: number) {
    return (await todos<CultoDoDia>(`SELECT c.id, c.data, c.nome_evento, c.congregacao_id, g.area_id, c.ponto_id, c.hora_inicio, c.hora_fim, c.tema, c.observacao, c.cancelado,
		        t.nome AS tipo, t.codigo_cc, ar.codigo AS area, g.nome AS congregacao, g.codigo, COALESCE(NULLIF(c.local_evento,''),p.nome) AS ponto,
		        COALESCE(NULLIF(p.endereco, ''), g.endereco) AS endereco,
		        COALESCE(NULLIF(p.maps, ''), g.maps) AS maps
		 FROM cultos c
		 JOIN tipos_culto t ON t.id = c.tipo_culto_id
		 JOIN congregacoes g ON g.id = c.congregacao_id
		 JOIN areas ar ON ar.id = g.area_id
		 LEFT JOIN pontos_pregacao p ON p.id = c.ponto_id
		 WHERE g.habilitada=1 AND c.data = ? AND g.area_id = ?
		 ORDER BY c.hora_inicio, g.codigo, p.nome IS NOT NULL, p.nome`, data, areaId));
}
export interface EscalaDoCulto {
    id: number;
    culto_id: number;
    usuario_id: number;
    autorizacao: 'aguardando' | 'autorizada';
    funcao: Funcao;
    resposta: 'pendente' | 'confirmado' | 'justificado';
    justificativa: string | null;
    indicado_por: number | null;
    nome: string;
    cargo: string;
    whatsapp: string;
    indicado_por_nome: string | null;
}
export async function escalasDoDia(data: string, areaId: number) {
    return (await todos<EscalaDoCulto>(`SELECT e.id, e.culto_id, e.usuario_id, e.autorizacao, e.funcao, e.resposta, e.justificativa, e.indicado_por,
		        u.nome, u.cargo, u.whatsapp, i.nome AS indicado_por_nome
		 FROM escalas e
		 JOIN cultos c ON c.id = e.culto_id
		 JOIN congregacoes g ON g.id = c.congregacao_id
		 JOIN usuarios u ON u.id = e.usuario_id
		 LEFT JOIN usuarios i ON i.id = e.indicado_por
		 WHERE g.habilitada=1 AND c.data = ? AND g.area_id = ?
		 ORDER BY e.funcao = 'titular' DESC, e.funcao = 'auxiliar', e.id`, data, areaId));
}
export interface Candidato {
    id: number;
    rotulo: string;
    recomendado: boolean;
}
/**
 * Prepara a lista de obreiros da área que podem ser escalados num culto do dia:
 * disponíveis no turno, sem indisponibilidade na data e sem outro culto no mesmo horário
 * aparecem primeiro, ordenados por quem foi menos escalado no mês.
 */
/** Com `congregacaoId` (Pb), a lista fica só com os obreiros daquela igreja. */
export async function montarCandidatos(data: string, areaId: number, congregacaoId: number | null = null) {
    const usuarios = (await todos<{
        id: number;
        nome: string;
        cargo: string;
    }>(`SELECT u.id, u.nome, u.cargo FROM usuarios u LEFT JOIN congregacoes g ON g.id = u.congregacao_id
		 WHERE u.status = 'ativo' AND COALESCE(u.area_id,g.area_id) = ? AND (? IS NULL OR u.congregacao_id = ?) ORDER BY u.nome`, areaId, congregacaoId, congregacaoId));
    const disponiveis = new Set((await todos<{
        usuario_id: number;
        turno: string;
    }>('SELECT usuario_id, turno FROM disponibilidades WHERE dia_semana = ?', diaSemana(data))).map((r) => `${r.usuario_id}-${r.turno}`));
    const indisponiveis = new Set((await todos<{
        usuario_id: number;
    }>('SELECT DISTINCT usuario_id FROM indisponibilidades WHERE inicio <= ? AND fim >= ?', data, data)).map((r) => r.usuario_id));
    const noMes = new Map((await todos<{
        usuario_id: number;
        n: number;
    }>(`SELECT e.usuario_id, COUNT(*) AS n FROM escalas e JOIN cultos c ON c.id = e.culto_id
			 WHERE substr(c.data, 1, 7) = ? AND c.cancelado = 0 GROUP BY e.usuario_id`, data.slice(0, 7))).map((r) => [r.usuario_id, r.n]));
    const ocupacoes = (await todos<{
        usuario_id: number;
        culto_id: number;
        hora_inicio: string;
        hora_fim: string;
    }>(`SELECT e.usuario_id, c.id AS culto_id, c.hora_inicio, c.hora_fim
		 FROM escalas e JOIN cultos c ON c.id = e.culto_id
		 WHERE c.data = ? AND c.cancelado = 0`, data));
    /**
     * `auxiliar`: lista para o Pb encaminhar um auxiliar na quarta-feira (não é escala publicada,
     * então não se aplica o cargo exigido pelo culto).
     */
    return (culto: {
        id: number;
        tipo: string;
        hora_inicio: string;
        hora_fim: string;
    }, auxiliar = false): Candidato[] => {
        const turno = turnoDoHorario(culto.hora_inicio);
        const jaNoCulto = new Set(ocupacoes.filter((o) => o.culto_id === culto.id).map((o) => o.usuario_id));
        return usuarios
            .filter((u) => !jaNoCulto.has(u.id) && (auxiliar || cargoPermitido(culto.tipo, u.cargo)))
            .map((u) => {
            const conflito = ocupacoes.some((o) => o.usuario_id === u.id && o.culto_id !== culto.id && sobrepoe(o, culto));
            const indisponivel = indisponiveis.has(u.id);
            const noTurno = disponiveis.has(`${u.id}-${turno}`);
            const n = noMes.get(u.id) ?? 0;
            const avisos = [
                indisponivel ? 'indisponível nesta data' : !noTurno ? 'fora da disponibilidade' : '',
                conflito ? 'já escalado neste horário' : ''
            ].filter(Boolean);
            return {
                id: u.id,
                nome: u.nome,
                n,
                recomendado: noTurno && !indisponivel && !conflito,
                rotulo: `${abrevCargo(u.cargo)} ${u.nome} · ${n}x no mês${avisos.length ? ` · ${avisos.join(', ')}` : ''}`
            };
        })
            .sort((a, b) => Number(b.recomendado) - Number(a.recomendado) || a.n - b.n || a.nome.localeCompare(b.nome, 'pt-BR'))
            .map(({ id, rotulo, recomendado }) => ({ id, rotulo, recomendado }));
    };
}
