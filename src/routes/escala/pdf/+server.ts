import { cultosDoDia, escalasDoDia, garantirCultos } from '#lib/server/cultos';
import { gerarPdfSemana, type DiaPdf } from '#lib/server/pdf';
import { dataValida, hojeISO, ehPb, segundaDaSemana, somarDias } from '#lib/util';
/** GET /escala/pdf?data=AAAA-MM-DD[&cong=id] — escala da semana (segunda a domingo) que contém a data. */
export const GET = async ({ url, locals }) => {
    const area = locals.area!;
    const param = url.searchParams.get('data');
    const segunda = segundaDaSemana(dataValida(param) ? param : hojeISO());
    // O Pb baixa só a escala da própria igreja; os demais, da área ou da congregação escolhida.
    const filtro = (locals.user?.gerencia_escala || !ehPb(locals.user) ? null : locals.user!.congregacao_id) ?? (Number(url.searchParams.get('cong')) || 0);
    let congregacao: string | null = null;
    const dias: DiaPdf[] = await Promise.all(Array.from({ length: 7 }, async (_, i) => {
        const data = somarDias(segunda, i);
        (await garantirCultos(data, area.id));
        // Escala publicada: só escalas autorizadas; quem auxilia o Pb na quarta-feira não entra.
        const escalas = (await escalasDoDia(data, area.id)).filter((e) => e.autorizacao === 'autorizada' && e.funcao !== 'auxiliar');
        const cultos = (await cultosDoDia(data, area.id)).filter((c) => !filtro || c.congregacao_id === filtro)
            .map((c) => {
            if (filtro)
                congregacao = c.congregacao;
            return { ...c, escalados: escalas.filter((e) => e.culto_id === c.id) };
        });
        return { data, cultos };
    }));
    const pdf = await gerarPdfSemana({ area, dias, congregacao });
    const nome = `escala-area${area.codigo}-${segunda}-a-${somarDias(segunda, 6)}.pdf`;
    return new Response(new Uint8Array(pdf), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${nome}"`,
            'Cache-Control': 'no-store'
        }
    });
};
