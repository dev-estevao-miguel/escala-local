import { defineEnvVars } from '@sveltejs/kit/env';
export const variables = defineEnvVars({
    ADMIN_SENHA: {
        public: false,
        static: false,
        description: 'Senha do Admin da plataforma (carteira 900001) ao criar o banco. Alias compatível com ADMIN_PASSWORD; segredos nunca são mostrados no console.',
        schema: (valor) => valor || undefined
    }
});
