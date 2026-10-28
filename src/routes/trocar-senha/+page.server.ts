import { criarSessao } from '#lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { executar, um } from '#lib/server/db';
import { validarSenha } from '#lib/server/obreiros';
import { conferirSenha, hashSenha } from '#lib/server/senha';
export const actions = {
    default: async ({ request, locals, cookies }) => {
        const f = await request.formData();
        const nova = String(f.get('nova') ?? '');
        const erro = validarSenha(nova, String(f.get('nova2') ?? ''));
        if (erro)
            return fail(400, { erro });
        const atual = (await um<{senha_hash:string}>('SELECT senha_hash FROM usuarios WHERE id=?', locals.user!.id))!;
        if (conferirSenha(nova, atual.senha_hash)) return fail(400, { erro: 'Crie uma senha pessoal diferente da senha temporária.' });
        (await executar('UPDATE usuarios SET senha_hash = ?, trocar_senha = 0, credencial_versao = credencial_versao + 1 WHERE id = ?', hashSenha(nova), locals.user!.id));
        await criarSessao(cookies,locals.user!.id);
        redirect(303, '/');
    }
};
