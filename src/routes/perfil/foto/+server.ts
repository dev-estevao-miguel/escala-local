import { error } from '@sveltejs/kit';
import { um } from '#lib/server/db';
export const GET=async({locals})=>{
 const foto=(await um<{foto_perfil:string|null}>('SELECT foto_perfil FROM usuarios WHERE id=?',locals.user!.id))?.foto_perfil;
 const partes=foto?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
 if(!partes)error(404,'Foto não encontrada.');
 return new Response(Buffer.from(partes[2],'base64'),{headers:{'Content-Type':partes[1],'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
};
