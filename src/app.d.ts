import type { Area, Usuario } from '#lib/util';
declare global {
    namespace App {
        interface Locals {
            user: Usuario | null;
            /** Área em que o usuário está trabalhando (null quando não está logado). */
            area: Area | null;
        }
    }
}
export {};
