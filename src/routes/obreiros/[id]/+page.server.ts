import { cargosConvite } from '#lib/server/convites';
import { auditar } from '#lib/server/auditoria';
import { error, fail } from '@sveltejs/kit';
import { exigir } from '#lib/server/auth';
import { executar, todos, transacao, um } from '#lib/server/db';
import { texto } from '#lib/server/form';
import { disponibilidadeDe, lerObreiro, listarCongregacoes, salvarDisponibilidade } from '#lib/server/obreiros';
import { gerarSenhaTemporaria, hashSenha } from '#lib/server/senha';
import { STATUS_OBREIRO, hojeISO, igrejaRestrita, perfisAtribuiveis, podeCadastrarObreiro, podeGerirArea, type Perfil, type Usuario } from '#lib/util';
/** Área do obreiro; a coordenação só vê e edita obreiros das áreas que coordena, o Pb os da própria área. */
async function areaDoObreiro(id: number) {
    return (await um<{
        area_id: number;
    }>('SELECT COALESCE(u.area_id,g.area_id) AS area_id FROM usuarios u LEFT JOIN congregacoes g ON g.id = u.congregacao_id WHERE u.id = ?', id))?.area_id;
}
/**
 * A coordenação da área edita os obreiros dela, exceto quem tem um perfil que ela não pode atribuir
 * (ex.: o vice não altera o coordenador; só o administrador geral altera outro administrador).
 */
async function podeEditarObreiro(u: Usuario | null, id: number, areaId: number) {
    if (!podeGerirArea(u, areaId))
        return false;
    const perfil = (await um<{
        perfil: Perfil;
    }>('SELECT perfil FROM usuarios WHERE id = ?', id))!.perfil;
    return id === u!.id || perfisAtribuiveis(u).includes(perfil);
}
async function exigirGestao(u: Usuario | null, id: number) {
    const areaId = (await areaDoObreiro(id));
    exigir(!!areaId && (await podeEditarObreiro(u, id, areaId)), 'Você não tem permissão para alterar este cadastro.');
    return areaId!;
}
export const load = async ({ params, locals, url }) => {
    const u = locals.user!;
    exigir(podeCadastrarObreiro(u), 'Acesso restrito à coordenação e aos Pbs responsáveis.');
    const id = Number(params.id);
    const areaId = (await areaDoObreiro(id));
    if (!areaId)
        error(404, 'Obreiro não encontrado.');
    exigir(podeGerirArea(u, areaId) || areaId === u.area_id, 'Este obreiro é de outra área.');
    const obreiro = (await um<{
        id: number;
        nome: string;
        nascimento: string;
        carteira: string;
        cargo: string;
        perfil: string;
        status: keyof typeof STATUS_OBREIRO;
        motivo_recusa: string | null;
        congregacao_id: number;
        whatsapp: string;
        criado_em: string;
        cadastrado_por_nome: string | null;
        aprovado_por_nome: string | null;
    }>(`SELECT u.id, u.nome, u.nascimento, u.carteira, u.cargo, u.perfil, u.status, u.motivo_recusa, u.congregacao_id, u.whatsapp, u.criado_em,
		        c.nome AS cadastrado_por_nome, a.nome AS aprovado_por_nome
		 FROM usuarios u
		 LEFT JOIN usuarios c ON c.id = u.cadastrado_por
		 LEFT JOIN usuarios a ON a.id = u.aprovado_por
		 WHERE u.id = ?`, id));
    if (!obreiro)
        error(404, 'Obreiro não encontrado.');
    const igreja = igrejaRestrita(u);
    exigir(!igreja || obreiro.congregacao_id === igreja, 'Este obreiro é de outra igreja.');
    return {
        obreiro: { ...obreiro, disponibilidade: (await disponibilidadeDe(id)) },
        indisponibilidades: (await todos<{
            id: number;
            inicio: string;
            fim: string;
            motivo: string;
        }>('SELECT id, inicio, fim, motivo FROM indisponibilidades WHERE usuario_id = ? AND fim >= ? ORDER BY inicio', id, hojeISO())),
        escalas: (await todos<{
            id: number;
            data: string;
            hora_inicio: string;
            tipo: string;
            congregacao: string;
            ponto: string | null;
            resposta: string;
            autorizacao: string;
        }>(`SELECT e.id, c.data, c.hora_inicio, COALESCE(NULLIF(c.nome_evento,''),t.nome) AS tipo, g.nome AS congregacao, p.nome AS ponto, e.resposta, e.autorizacao
			 FROM escalas e
			 JOIN cultos c ON c.id = e.culto_id
			 JOIN tipos_culto t ON t.id = c.tipo_culto_id
			 JOIN congregacoes g ON g.id = c.congregacao_id
			 LEFT JOIN pontos_pregacao p ON p.id = c.ponto_id
			 WHERE e.usuario_id = ? AND c.data >= ? AND c.cancelado = 0
			 ORDER BY c.data, c.hora_inicio`, id, hojeISO())),
        congregacoes: (await listarCongregacoes(areaId)),
        perfis: perfisAtribuiveis(u),
        podeEditar: (await podeEditarObreiro(u, id, areaId)),
        podeStatus: id!==u.id&&((await podeEditarObreiro(u,id,areaId))||(u.perfil==='pb'&&obreiro.perfil==='obreiro'&&obreiro.congregacao_id===u.congregacao_id)),
        novo: url.searchParams.has('novo')
    };
};
export const actions = {
    status:async({locals,params,request})=>{
      const u=locals.user!,id=Number(params.id),f=await request.formData(),status=texto(f,'status');
      const alvo=await um<{perfil:string;congregacao_id:number;area_id:number}>('SELECT perfil,congregacao_id,area_id FROM usuarios WHERE id=?',id);
      exigir(!!alvo&&id!==u.id&&(podeGerirArea(u,alvo.area_id)||(u.perfil==='pb'&&alvo.perfil==='obreiro'&&alvo.congregacao_id===u.congregacao_id)));
      if(!['ativo','inativo','removido'].includes(status))return fail(400,{erro:'Situação inválida.'});
      await executar("UPDATE usuarios SET status=?,gerencia_escala=0,credencial_versao=credencial_versao+1 WHERE id=? AND perfil<>'admin'",status,id);
      await auditar(u.id,'usuario_'+status,'usuario',id);return {ok:'Situação atualizada.'};
    },
    salvar: async ({ request, params, locals }) => {
        const u = locals.user!;
        const id = Number(params.id);
        const areaId = (await exigirGestao(u, id));
        const f = await request.formData();
        const papel=texto(f,'perfil') as Perfil;
        const { d, erro } = (await lerObreiro(f, areaId, id,['coordenador','vice'].includes(papel)));
        if(!cargosConvite(papel).includes(d.cargo)) return fail(400,{erro:'Cargo incompatível com o perfil.'});
        const perfil = texto(f, 'perfil') as Perfil;
        const status = texto(f, 'status');
        if (erro)
            return fail(400, { erro });
        const perfilAtual = (await um<{
            perfil: Perfil;
        }>('SELECT perfil FROM usuarios WHERE id = ?', id))!.perfil;
        if (perfil !== perfilAtual && (!perfisAtribuiveis(u).includes(perfil) || !perfisAtribuiveis(u).includes(perfilAtual))) {
            return fail(403, { erro: 'Você não tem permissão para dar ou tirar este perfil.' });
        }
        if (!(status in STATUS_OBREIRO))
            return fail(400, { erro: 'Situação inválida.' });
        if (id === u.id && (status !== 'ativo' || perfil !== perfilAtual)) {
            return fail(400, { erro: 'Você não pode alterar o seu próprio perfil ou desativar o seu acesso.' });
        }
        if(perfil==='pb'&&status==='ativo'&&await um("SELECT id FROM usuarios WHERE congregacao_id=? AND perfil='pb' AND status='ativo' AND id<>?",d.congregacao_id,id))return fail(409,{erro:'Esta congregação já possui responsável. Use Alterar responsável na lista de congregações.'});
        (await transacao(async () => {
            if(!['pb','obreiro'].includes(perfil)||status!=='ativo')await executar('UPDATE usuarios SET gerencia_escala=0 WHERE id=?',id);
            const anterior = (await um<{
                status: string;
            }>('SELECT status FROM usuarios WHERE id = ?', id));
            (await executar(`UPDATE usuarios SET nome = ?, carteira = ?, cargo = ?, perfil = ?, status = ?, congregacao_id = ?, whatsapp = ? WHERE id = ?`, d.nome, d.carteira, d.cargo, perfil, status, ['coordenador','vice'].includes(perfil)?(d.congregacao_id||null):d.congregacao_id, d.whatsapp, id));
            if (anterior?.status !== 'ativo' && status === 'ativo') {
                (await executar(`UPDATE usuarios SET aprovado_por = ?, aprovado_em = datetime('now', 'localtime') WHERE id = ?`, locals.user!.id, id));
            }
            await executar(`UPDATE usuarios SET nascimento = ?, gerencia_escala = CASE WHEN ? IN ('pb','obreiro') AND ? = 'ativo' THEN gerencia_escala ELSE 0 END WHERE id = ?`,d.nascimento||null,perfil,status,id);
        (await salvarDisponibilidade(id, d.disponibilidade));
        }));
        await auditar(u.id,'cadastro_alterado','usuario',id);
        return { ok: 'Cadastro atualizado.' };
    },
    redefinirSenha: async ({ params, locals }) => {
        (await exigirGestao(locals.user, Number(params.id)));
        const senhaTemporaria = gerarSenhaTemporaria();
        (await executar('UPDATE usuarios SET senha_hash = ?, trocar_senha = 1, credencial_versao = credencial_versao + 1 WHERE id = ?', hashSenha(senhaTemporaria), Number(params.id)));
        await auditar(locals.user!.id, 'senha_redefinida', 'usuario', Number(params.id));
        return { ok: 'Senha temporária gerada. Envie diretamente ao obreiro; ele deverá criar uma senha pessoal no próximo acesso.', senhaTemporaria };
    }
};
