/** Remove credenciais antes de registrar erros no banco ou no console. */
export function ocultarSegredos(texto: string, ambiente: NodeJS.ProcessEnv = process.env) {
	const segredos = Object.entries(ambiente)
		.filter(([chave, valor]) => /PASSWORD|SENHA|SEGREDO|TOKEN|DATABASE_URL|SERVICE_ROLE/i.test(chave) && valor && valor.length >= 4)
		.map(([, valor]) => valor!);
	try {
		const senha = new URL(ambiente.DATABASE_URL ?? '').password;
		if (senha) segredos.push(senha, decodeURIComponent(senha));
	} catch { /* Uma URI inválida também será ocultada como valor completo. */ }
	let resultado = texto;
	for (const segredo of [...new Set(segredos)].sort((a, b) => b.length - a.length)) resultado = resultado.split(segredo).join('[oculto]');
	return resultado.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, '[conexão oculta]').slice(0, 8192);
}
