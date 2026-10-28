import { um } from '#lib/server/db';
import { listarAreas } from '#lib/server/obreiros';
import { ehAdmin, ehAdminGeral } from '#lib/util';
import {contarNaoLidas} from '#lib/server/notificacoes';
export const load = async ({ locals }) => {
    const { user, area } = locals;
    let pendencias = 0;
    if (ehAdmin(user) && area) {
        pendencias = (await um<{
            n: number;
        }>(`SELECT (SELECT COUNT(*) FROM usuarios u JOIN congregacoes g ON g.id = u.congregacao_id
			         WHERE u.status = 'pendente' AND g.area_id = ?)
			      + (SELECT COUNT(*) FROM escalas e JOIN cultos c ON c.id = e.culto_id JOIN congregacoes g ON g.id = c.congregacao_id
			         WHERE e.autorizacao = 'aguardando' AND g.area_id = ?) AS n`, area.id, area.id))!.n;
    }
    return {
        user,
        area,
        pendencias,
        notificacoesNaoLidas:user&&area&&!ehAdminGeral(user)?await contarNaoLidas(user.id,area.id):0,
        cadastroArea: area ? await um<{configurada:number;quantidade_prevista:number;igrejas:number}>(`SELECT a.configurada,a.quantidade_prevista,(SELECT COUNT(*) FROM congregacoes g WHERE g.area_id=a.id AND g.habilitada=1) AS igrejas FROM areas a WHERE a.id=?`,area.id) : null,
        ambienteTeste: !process.env.DATABASE_URL
    };
};
