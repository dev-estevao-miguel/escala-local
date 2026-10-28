import {exigir} from '#lib/server/auth';
import {conviteAtivo,emitirConvite} from '#lib/server/convites';
import {definirPrimeiraArea} from '#lib/server/coordenadores';
import {redirect} from '@sveltejs/kit';
import {resumoDashboard} from '#lib/server/dashboard';
import { fail } from '@sveltejs/kit';
import { garantirCultos } from '#lib/server/cultos';
import { executar, todos, um } from '#lib/server/db';
import { inteiro, texto } from '#lib/server/form';
import { ehAdmin, ehAdminGeral, ehPb, dataValida, hojeISO, somarDias, type Funcao, type Resposta } from '#lib/util';
const SELECAO_ESCALA = `
	SELECT e.id, e.resposta, e.justificativa, e.funcao, c.data, c.hora_inicio, c.hora_fim, c.tema,
	       COALESCE(NULLIF(c.nome_evento,''),t.nome) AS tipo, ar.codigo AS area, g.nome AS congregacao, COALESCE(NULLIF(c.local_evento,''),p.nome) AS ponto,
	       COALESCE(NULLIF(p.endereco, ''), g.endereco) AS endereco,
	       COALESCE(NULLIF(p.maps, ''), g.maps) AS maps,
	       u.nome, u.cargo
	FROM escalas e
	JOIN usuarios u ON u.id = e.usuario_id
	JOIN cultos c ON c.id = e.culto_id
	JOIN tipos_culto t ON t.id = c.tipo_culto_id
	JOIN congregacoes g ON g.id = c.congregacao_id
	JOIN areas ar ON ar.id = g.area_id
	LEFT JOIN pontos_pregacao p ON p.id = c.ponto_id`;
export interface EscalaCompleta {
    id: number;
    resposta: Resposta;
    funcao: Funcao;
    justificativa: string | null;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    tema: string;
    tipo: string;
    area: string;
    congregacao: string;
    ponto: string | null;
    endereco: string;
    maps: string;
    nome: string;
    cargo: string;
}
export const load = async ({ locals }) => {
 const u=locals.user!,area=locals.area;
 const base={hoje:hojeISO(),minhas:[] as EscalaCompleta[],resumo:null as Awaited<ReturnType<typeof resumoDashboard>>|null,convite:null as Awaited<ReturnType<typeof conviteAtivo>>};
 if(ehAdminGeral(u))return {...base,convite:await conviteAtivo('coordenador',null)};
 if(!area)return base;
 if(ehAdmin(u))return {...base,resumo:await resumoDashboard(area.id)};
 const minhas=await todos<EscalaCompleta>(`${SELECAO_ESCALA} WHERE e.usuario_id=? AND g.area_id=? AND e.autorizacao='autorizada' AND c.cancelado=0 AND c.data>=? ORDER BY c.data,c.hora_inicio`,u.id,area.id,hojeISO());
 return {...base,minhas};
};
export const actions = {
 convidarCoordenador:async({locals,request})=>{exigir(ehAdminGeral(locals.user));const f=await request.formData();f.set('perfil','coordenador');return emitirConvite(locals.user!,null,f);},
 definirArea:async({locals,request})=>{const r=await definirPrimeiraArea(locals.user!,texto(await request.formData(),'codigo'));if('ok' in r)redirect(303,'/');return r;},
    confirmar: async ({ request, locals }) => {
        exigir(!ehAdminGeral(locals.user)&&!!locals.area);
        const f = await request.formData();
        (await executar(`UPDATE escalas SET resposta = 'confirmado', justificativa = NULL WHERE id = ? AND usuario_id = ?`, inteiro(f, 'id'), locals.user!.id));
        return { ok: 'Presença confirmada. Deus abençoe!' };
    },
    justificar: async ({ request, locals }) => {
        exigir(!ehAdminGeral(locals.user)&&!!locals.area);
        const f = await request.formData();
        const justificativa = texto(f, 'justificativa');
        if (justificativa.length < 3)
            return fail(400, { erro: 'Escreva o motivo da ausência.' });
        (await executar(`UPDATE escalas SET resposta = 'justificado', justificativa = ? WHERE id = ? AND usuario_id = ?`, justificativa, inteiro(f, 'id'), locals.user!.id));
        return { ok: 'Justificativa enviada. A coordenação foi avisada para providenciar substituto.' };
    }
};
