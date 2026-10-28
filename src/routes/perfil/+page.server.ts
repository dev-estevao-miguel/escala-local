import { criarSessao,exigir } from '#lib/server/auth';
import { fail } from '@sveltejs/kit';
import { executar, todos, um } from '#lib/server/db';
import { inteiro, texto } from '#lib/server/form';
import { disponibilidadeDe, lerDisponibilidade, salvarDisponibilidade, validarSenha } from '#lib/server/obreiros';
import { hashSenha } from '#lib/server/senha';
import { CARGOS,ehAdminGeral,dataValida, hojeISO } from '#lib/util';
import { normalizarWhatsApp } from '#lib/contato';
import { salvarFoto,removerFoto } from '#lib/server/foto';
export const load = async ({ locals }) => {
    const id = locals.user!.id;
    return {
        cadastro: (await um<{nome:string;nascimento:string|null}>('SELECT nome,nascimento FROM usuarios WHERE id=?',id))!,
        whatsapp: (await um<{
            whatsapp: string;
        }>('SELECT whatsapp FROM usuarios WHERE id = ?', id))!.whatsapp,
        disponibilidade: ehAdminGeral(locals.user)?[]:(await disponibilidadeDe(id)),
        indisponibilidades: ehAdminGeral(locals.user)?[]:(await todos<{
            id: number;
            inicio: string;
            fim: string;
            motivo: string;
        }>('SELECT id, inicio, fim, motivo FROM indisponibilidades WHERE usuario_id = ? AND fim >= ? ORDER BY inicio', id, hojeISO())),
        hoje: hojeISO()
    };
};
export const actions = {
    foto:async({request,locals})=>{
        const resultado=await salvarFoto(locals.user!.id,await request.formData());
        if('ok' in resultado)locals.user!.foto_versao=(await um<{foto_versao:number}>('SELECT foto_versao FROM usuarios WHERE id=?',locals.user!.id))!.foto_versao;
        return resultado;
    },
    removerFoto:async({locals})=>{
        const resultado=await removerFoto(locals.user!.id);
        locals.user!.foto_versao=0;
        return resultado;
    },
    dados: async ({ request, locals }) => {
        const f = await request.formData();
        const whatsapp=normalizarWhatsApp(texto(f,'whatsapp')),nome=texto(f,'nome'),nascimento=texto(f,'nascimento');
        if(nome.length<3||(!whatsapp&&locals.user!.perfil!=='admin')||(nascimento&&(!dataValida(nascimento)||nascimento>=hojeISO()||nascimento<'1900-01-01')))return fail(400,{erro:'Confira nome, WhatsApp e data de nascimento.',secao:'dados'});
        (await executar('UPDATE usuarios SET nome=?,nascimento=?,whatsapp = ? WHERE id = ?',nome,nascimento||null,whatsapp,locals.user!.id));
        if(!ehAdminGeral(locals.user))await salvarDisponibilidade(locals.user!.id,lerDisponibilidade(f));
        else {const cargo=texto(f,'cargo');if(cargo&&!CARGOS.some(c=>c.nome===cargo))return fail(400,{erro:'Cargo inválido.',secao:'dados'});await executar('UPDATE usuarios SET cargo=? WHERE id=?',cargo,locals.user!.id);}
        return { ok: 'Dados salvos.', secao: 'dados' };
    },
    indisponivel: async ({ request, locals }) => {
        exigir(!ehAdminGeral(locals.user)&&!!locals.area);
        const f = await request.formData();
        const inicio = texto(f, 'inicio');
        const fim = texto(f, 'fim') || inicio;
        if (!dataValida(inicio) || !dataValida(fim) || fim < inicio) {
            return fail(400, { erro: 'Informe datas válidas.', secao: 'indisponivel' });
        }
        (await executar('INSERT INTO indisponibilidades (usuario_id, inicio, fim, motivo) VALUES (?, ?, ?, ?)', locals.user!.id, inicio, fim, texto(f, 'motivo')));
        return { ok: 'Indisponibilidade registrada.', secao: 'indisponivel' };
    },
    removerIndisponivel: async ({ request, locals }) => {
        exigir(!ehAdminGeral(locals.user)&&!!locals.area);
        const f = await request.formData();
        (await executar('DELETE FROM indisponibilidades WHERE id = ? AND usuario_id = ?', inteiro(f, 'id'), locals.user!.id));
        return { ok: 'Indisponibilidade removida.', secao: 'indisponivel' };
    },
    senha: async ({ request, locals, cookies }) => {
        const f = await request.formData();
        const nova = String(f.get('nova') ?? '');
        const erro = validarSenha(nova, String(f.get('nova2') ?? ''));
        if (erro)
            return fail(400, { erro, secao: 'senha' });
        (await executar('UPDATE usuarios SET senha_hash = ?, trocar_senha = 0, credencial_versao = credencial_versao + 1 WHERE id = ?', hashSenha(nova), locals.user!.id));
        await criarSessao(cookies,locals.user!.id);
        return { ok: 'Senha alterada.', secao: 'senha' };
    }
};
