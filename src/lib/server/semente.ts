// Base inicial: somente administrador e tipos configuráveis; nenhuma área, igreja ou conta demonstrativa.
import type { DatabaseSync } from 'node:sqlite';
import { hashSenha, senhaDoAdmin } from './senha';

const NOITE = ['19:00', '21:00'] as const;
const TARDE = ['14:00', '16:00'] as const;

const TIPOS: [nome: string, horario: readonly [string, string]][] = [
	['Pregação', NOITE],
	['Doutrina', NOITE],
	['Oração', NOITE],
	['Círculo de Oração', TARDE],
	['Santa Ceia', NOITE],
	['Culto para Mocidade', NOITE],
	['Culto do Proati', NOITE],
	['Ponto de Pregação', NOITE],
	['Festividade de Órgão', NOITE],
	['Oração para Mocidade', NOITE],
	['Estudos', NOITE]
];

const DIAS: Record<string, number> = {
	domingo: 0,
	'segunda-feira': 1,
	'terça-feira': 2,
	'quarta-feira': 3,
	'quinta-feira': 4,
	'sexta-feira': 5,
	sábado: 6
};

interface RegraLida {
	dia: number;
	semana: number | null;
	periodo: 'noite' | 'dia' | null;
}

/**
 * Interpreta a coluna "quando" da agenda oficial. Exemplos:
 * "Terça-feira", "2ª semana · Terça-feira", "3º domingo do mês", "Quarta-feira (durante o dia)",
 * "Segunda-feira · Quarta-feira (à noite)". Valores vazios ou ilegíveis são ignorados.
 */
export function interpretarQuando(quando: string): RegraLida[] {
	let q = quando.trim().toLowerCase();
	let periodo: RegraLida['periodo'] = null;
	if (q.includes('(à noite)')) periodo = 'noite';
	if (q.includes('(durante o dia)')) periodo = 'dia';
	q = q.replace(/\(.*?\)/g, '').trim();

	const semana = q.match(/^(\d)\S* semana\s*·\s*(.+)$/);
	if (semana && semana[2] in DIAS) return [{ dia: DIAS[semana[2]], semana: Number(semana[1]), periodo }];

	const domingo = q.match(/^(\d)\S* domingo( do m[êe]s)?$/);
	if (domingo) return [{ dia: 0, semana: Number(domingo[1]), periodo }];

	const dias = q.split('·').map((d) => d.trim());
	if (dias.length && dias.every((d) => d in DIAS)) return dias.map((d) => ({ dia: DIAS[d], semana: null, periodo }));
	return [];
}

export function semear(db: DatabaseSync) {
 if (!db.prepare("SELECT id FROM usuarios WHERE perfil='admin'").get()) {
  db.prepare(`INSERT INTO usuarios(nome,carteira,senha_hash,cargo,perfil,status) VALUES (?,?,?,?,'admin','ativo')`).run('Administrador',process.env.ADMIN_LOGIN || '900001',hashSenha(senhaDoAdmin()),'');
 }
 for (const [nome, horas] of TIPOS) db.prepare('INSERT OR IGNORE INTO tipos_culto(nome,hora_inicio,hora_fim) VALUES (?,?,?)').run(nome,horas[0],horas[1]);
}
