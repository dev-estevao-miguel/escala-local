interface InstallEvent extends Event{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export const instalacao=$state({pronto:false,mobile:false,ios:false,instalado:false,oculto:false,convite:null as InstallEvent|null});
const CHAVE='demo-instalar-depois';
export function dispensarInstalacao(){instalacao.oculto=true;try{localStorage.setItem(CHAVE,String(Date.now()+7*24*60*60*1000));}catch{/* Navegação privada sem armazenamento. */}}
export function iniciarInstalacao(){
 const modo=matchMedia('(display-mode: standalone)');
 const atualizar=()=>{instalacao.ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);instalacao.mobile=instalacao.ios||/Android|Mobile/.test(navigator.userAgent)||(navigator.maxTouchPoints>0&&matchMedia('(pointer: coarse)').matches&&innerWidth<=1024);instalacao.instalado=modo.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone;};
 atualizar();try{instalacao.oculto=Number(localStorage.getItem(CHAVE))>Date.now();}catch{/* Sem persistência disponível. */}instalacao.pronto=true;
 const capturar=(e:Event)=>{if(instalacao.mobile){e.preventDefault();instalacao.convite=e as InstallEvent;}};
 const concluir=()=>{instalacao.instalado=true;instalacao.convite=null;dispensarInstalacao();};
 window.addEventListener('beforeinstallprompt',capturar);window.addEventListener('appinstalled',concluir);modo.addEventListener('change',atualizar);window.addEventListener('resize',atualizar);
 return()=>{window.removeEventListener('beforeinstallprompt',capturar);window.removeEventListener('appinstalled',concluir);modo.removeEventListener('change',atualizar);window.removeEventListener('resize',atualizar);};
}
