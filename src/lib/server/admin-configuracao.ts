import { executar, transacao, um } from './db';
import { auditar } from './auditoria';
import { conferirSenha, hashSenha } from './senha';
import { validarSenha } from './obreiros';
import { CHAVE_CONFIGURACAO_ADMIN, validarConfiguracaoAdmin } from './admin-configuracao-dados';

export async function configuracaoAdminAtiva(token: string) {
	if (!/^[\w-]{43}$/.test(token)) return null;
	const salvo = await um<{valor:string}>('SELECT valor FROM config WHERE chave=?', CHAVE_CONFIGURACAO_ADMIN);
	const r = salvo ? validarConfiguracaoAdmin(salvo.valor, token) : null;
	if (!r) return null;
	const usuario = await um<{id:number;credencial_versao:number;senha_hash:string}>("SELECT id,credencial_versao,senha_hash FROM usuarios WHERE id=? AND carteira='900001' AND perfil='admin' AND status='ativo'", r.usuarioId);
	return usuario && usuario.credencial_versao === r.versao ? usuario : null;
}

export async function cadastrarSenhaAdmin(token: string, senha: string, repetida: string) {
	return transacao<{usuarioId:number}|{status:400|410;erro:string}>(async () => {
		// Serializa o consumo do link também entre instâncias PostgreSQL.
		await executar('UPDATE config SET valor=valor WHERE chave=?', CHAVE_CONFIGURACAO_ADMIN);
		const usuario = await configuracaoAdminAtiva(token);
		if (!usuario) return { status: 410, erro: 'Este link expirou ou já foi utilizado. Solicite um novo link privado.' } as const;
		const erro = validarSenha(senha, repetida) || (senha.length < 10 ? 'Use uma senha de administrador com pelo menos 10 caracteres.' : '');
		if (erro) return { status: 400, erro } as const;
		if (conferirSenha(senha, usuario.senha_hash)) return { status: 400, erro: 'Escolha uma senha diferente da anterior.' } as const;
		const r = await executar("UPDATE usuarios SET senha_hash=?,trocar_senha=0,credencial_versao=credencial_versao+1 WHERE id=? AND carteira='900001' AND perfil='admin' AND status='ativo' AND credencial_versao=?", hashSenha(senha), usuario.id, usuario.credencial_versao);
		if (!r.alteradas) return { status: 410, erro: 'A conta foi atualizada. Solicite um novo link privado.' } as const;
		await executar('DELETE FROM config WHERE chave=?', CHAVE_CONFIGURACAO_ADMIN);
		await auditar(usuario.id, 'admin_senha_cadastrada', 'usuario', usuario.id);
		return { usuarioId: usuario.id } as const;
	});
}
