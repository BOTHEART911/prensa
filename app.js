const API_BASE = 'https://script.google.com/macros/s/AKfycbzHH5u3VuZU0g3oef7qATHi1blNKsVZQu3PAHt2mfO8lsXTkQOQ6gLfNenkfOl9YHIsbw/exec';

/* ================== NUEVO: BUILDERBOT (envío WhatsApp 1x1 y a grupo) ================== */
/* Tomado como referencia de indexref.md, adaptado a esta app */
const BUILDERBOT_ENDPOINT = 'https://app.builderbot.cloud/api/v2/ff37a123-12b0-4fdc-9866-f3e2daf389fb/messages';
const BUILDERBOT_API_KEY  = 'bb-7f9ef630-5cfc-4ba4-9258-5e7cecbb4f65';
const BRIEF_GROUP_ID = 'IPI7t3SAtOhHuWpJuxw8Us';

function sendBuilderbotMessage(destino, mensaje, mediaUrl){
  const numberField = String(destino || '').trim();
  if(!numberField){
    console.warn('Destino vacío, no se envía BuilderBot');
    return;
  }

  const payload = {
    messages: { content: mensaje },
    number: numberField,       // Puede ser número normalizado o ID de grupo
    checkIfExists: false
  };

  if (mediaUrl) {
    payload.messages.mediaUrl = String(mediaUrl).trim();
  }

  fetch(BUILDERBOT_ENDPOINT, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-builderbot':BUILDERBOT_API_KEY
    },
    body: JSON.stringify(payload)
  }).catch(err => console.warn('Error enviando BuilderBot', err));
}

function normalizeWhatsApp57(raw){
  let num = String(raw || '').replace(/\D/g,'');
  if(!num) return '';
  if(num.length === 10 && !num.startsWith('57')) num = '57' + num;
  if(!(num.length === 12 && num.startsWith('57'))) return '';
  return num;
}

function sleepMs(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}
/* ================== FIN BUILDERBOT ================== */

const SOUNDS = {
  question: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_fail_ls2aif.mp3',
  info: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Default_notification_pkp4wr.mp3',
  success: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_success_t5aawh.mp3',
  error: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  warning: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  login: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_star_g1owy4.mp3',
  logout: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_End_kelv02.mp3',
  back: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Keyboard_Enter_b9k2dc.mp3',
  menu: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Namedrop_Popup_ale2zy.mp3'
};
function playSoundOnce(url){
  try{
    const a = new Audio(url);
    a.preload = 'auto';
    a.play().catch(()=>{});
  }catch(e){}
}
if (window.Swal && typeof Swal.fire === 'function'){
  const __fire = Swal.fire.bind(Swal);
  Swal.fire = function(options = {}, ...rest){
    try{
      const icon = options.icon || options.type;
      if (icon && SOUNDS[icon]) playSoundOnce(SOUNDS[icon]);
    }catch(e){}
    return __fire(options, ...rest);
  }
}

const loader = document.getElementById('loader');
let loadingCount = 0;
let loaderTimer = null;

function startLoading(){
  loadingCount++;
  if (loadingCount === 1){
    loaderTimer = setTimeout(()=>{ loader.classList.remove('hidden'); loaderTimer = null; }, 120);
  }
}
function stopLoading(){
  if (loadingCount === 0) return;
  loadingCount--;
  if (loadingCount === 0){
    if (loaderTimer){ clearTimeout(loaderTimer); loaderTimer = null; }
    loader.classList.add('hidden');
  }
}

async function apiGet(action, params = {}){
  startLoading();
  try{
    const url = new URL(API_BASE);
    url.search = new URLSearchParams({ action, ...params }).toString();
    const r = await fetch(url.toString(), { method: 'GET' });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}
async function apiPost(action, body = {}){
  startLoading();
  try{
    const url = API_BASE + '?action=' + encodeURIComponent(action);
    const r = await fetch(url, {
      method:'POST',
      headers: { 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}

function showView(id){
  for(const el of document.querySelectorAll('.view')) el.classList.remove('active');
  const v = document.getElementById(id);
  if(v) v.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================== LOGIN ================== */
let currentUser = null;
let supervisorNombreCompleto = '';

const loginCedula = document.getElementById('login-cedula');
document.getElementById('toggle-cedula').addEventListener('click', ()=>{
  const oculto = loginCedula.type === 'password';
  loginCedula.type = oculto ? 'text' : 'password';
  const nuevoIcono = oculto
    ? 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Ocultar_lgdxpd.png'
    : 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Mostrar_yymceh.png';
  const accion = oculto ? 'Ocultar' : 'Mostrar';
  document.getElementById('toggle-cedula').setAttribute('aria-label', accion + ' cédula');
  document.getElementById('toggle-cedula').innerHTML = '<img src="'+nuevoIcono+'" alt="'+accion+'">';
});
document.getElementById('btn-login').addEventListener('click', async ()=>{
  const cedula = (loginCedula.value||'').trim();
  if(!/^\d{6,10}$/.test(cedula)){
    Swal.fire({icon:'warning',title:'¿Deseas Iniciar Sesión?',text:'Ingresa tu Contraseña'}); return;
  }
  try{
    const res = await apiGet('loginPrensa', { cedula });
    if(!res || !res.encontrado){
      const soporte = '573103230712';
      const mensaje = 'Buen día *Oscar*%0A%0ANo tengo acceso a la app de Supervisión.%0A' +
        'Mi contraseña: *' + cedula + '*%0A' +
        'Te dejo mis datos a continuación:%0A*Nombre Completo:*%0A*Celular:*';
      const esMovil = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
      const urlWA = esMovil
        ? 'whatsapp://send?phone=' + soporte + '&text=' + mensaje
        : 'https://api.whatsapp.com/send?phone=' + soporte + '&text=' + mensaje;

      const rs = await Swal.fire({
        icon: 'error',
        title: 'NO TIENES ACCESO',
        text: 'Toma una de las opciones',
        showConfirmButton: true,
        confirmButtonText: 'Solicitar Acceso',
        showDenyButton: true,
        denyButtonText: 'Rectificar / Salir'
      });

      if (rs.isConfirmed){
        window.open(urlWA, '_blank');
        await Swal.fire({
          icon: 'success',
          title: 'Se abrió WhatsApp',
          text: 'Solicita tu habilitación por ese medio.',
          timer: 6000,
          showConfirmButton: false
        });
        return;
      } else if (rs.isDenied){
        loginCedula.value = '';
        return;
      }
    }

    currentUser = {
      cedula,
      nombre: res.nombre || '',
      telefono: res.telefono || ''
    };

    playSoundOnce(SOUNDS.login);

    renderInicio();
    showView('view-inicio');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
document.getElementById('btn-logout').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.logout);
  currentUser = null; supervisorNombreCompleto = '';
  loginCedula.value = '';
  showView('view-login');
});

function formatoFechaHumana(date){
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const d=dias[date.getDay()];
  const dia=('0'+date.getDate()).slice(-2);
  const mes=meses[date.getMonth()];
  const y=date.getFullYear();
  return `${d}, ${dia} de ${mes} de ${y}`;
}

function renderInicio(){
  document.getElementById('inicio-profesional').textContent =
    'Hi, ' + (currentUser?.nombre || '');
  document.getElementById('inicio-fecha').textContent =
    formatoFechaHumana(new Date());
}

/* ================== CONTROL DE PERMISOS BRIEF ================== */
const BRIEF_ADMINS = ['OSCAR POLANIA','LAURA ORTIZ','IVAN OSPINA'];
const BRIEF_ASSIGNEES = ['DIEGO MENDEZ','ANDRYO SANABRIA','CANDY PALOMAR','DARWIN COBOS'];

function normName(v){
  return String(v || '').trim().toUpperCase();
}
function userIsBriefAdmin(){
  return BRIEF_ADMINS.includes(normName(currentUser?.nombre || ''));
}
function userIsBriefAssignee(){
  return BRIEF_ASSIGNEES.includes(normName(currentUser?.nombre || ''));
}
function userCanEditAssignedField(){
  const n = normName(currentUser?.nombre || '');
  return (n === 'OSCAR POLANIA' || n === 'LAURA ORTIZ');
}

function setBriefDetailEditMode(){
  const canFullEdit = userIsBriefAdmin();
  const allowAssigned = userCanEditAssignedField();

  const readonlyIds = [
    'nombreEvents','fechaEvents','horaIs','horaFs',
    'detalls','otrs','lugarEvents','fechaPubs',
    'nombs','contacts','secrets','cargos'
  ];

  readonlyIds.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(el.tagName === 'SELECT'){
      el.disabled = !canFullEdit;
    }else{
      el.readOnly = !canFullEdit;
      if(el.tagName === 'TEXTAREA') el.disabled = !canFullEdit;
    }
  });

  const reqChecks = document.querySelectorAll('#requerimients input[type="checkbox"]');
  reqChecks.forEach(ch => ch.disabled = !canFullEdit);

  document.getElementById('estads').disabled = false;

  const wrap = document.getElementById('assign-wrap');
  if(wrap){
    if(allowAssigned){
      wrap.classList.remove('hidden');
    }else{
      wrap.classList.add('hidden');
    }
  }

  /* NUEVO: checkbox Enviar mensaje visible SOLO a los 3 admins (OSCAR, LAURA, IVAN) */
  const sendWrap = document.getElementById('sendmsg-wrap');
  const sendCheck = document.getElementById('sendmsg-check');
  if(sendWrap && sendCheck){
    if(userIsBriefAdmin()){
      sendWrap.classList.remove('hidden');
    }else{
      sendWrap.classList.add('hidden');
      sendCheck.checked = false;
    }
  }

  /* Botón DETALLES A GRUPO: visible solo para super usuarios (BRIEF_ADMINS) */
  const btnShareGroup = document.getElementById('brief-share-group');
  if(btnShareGroup){
    if(userIsBriefAdmin()){
      btnShareGroup.classList.remove('hidden');
    }else{
      btnShareGroup.classList.add('hidden');
    }
  }
}

  /* ================== MIS INFORMES ================== */
document.getElementById('go-mis-informes')?.addEventListener('click', async ()=>{
  // mismo sonido que usas para entrar a módulos
  playSoundOnce(SOUNDS.login);

  if(!currentUser?.cedula){
    Swal.fire({icon:'warning', title:'Sesión inválida'});
    return;
  }

  try{
    const r = await apiGet('getMisInformesUrl', { cedula: currentUser.cedula });

    const url = String(r?.url || '').trim();
    if(!url){
      Swal.fire({ icon:'info', title:'Sin enlace', text:'No tienes enlace registrado en MIS INFORMES.' });
      return;
    }

    // Abre en nueva pestaña
    window.open(url, '_blank');
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
});

/* ================== COMUNICADOS ================== */
document.getElementById('go-comunicados').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  showView('view-comunicados');
});
document.getElementById('comunicado-enviar').addEventListener('click', async ()=>{
  const txt=(document.getElementById('comunicado-text').value||'').trim();
  if(!txt){ Swal.fire({icon:'warning',title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarComunicadoPrensa',{
      profesional: currentUser?.nombre || '',
      noticia: txt
    });
    Swal.fire({icon:'success',title:'COMUNICADO CARGADO CON ÉXITO',timer:4000,showConfirmButton:false});
    document.getElementById('comunicado-text').value='';
    renderInicio(); showView('view-inicio');
  }catch(e){ Swal.fire({icon:'error',title:'Error',text:e.message}); }
});
document.getElementById('comunicado-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== SOPORTE ================== */
document.getElementById('go-soporte').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  showView('view-soporte');
});
document.getElementById('soporte-enviar').addEventListener('click', async ()=>{
  const txt=(document.getElementById('soporte-text').value||'').trim();
  if(!txt){ Swal.fire({icon:'warning',title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarSoportePrensa',{
      profesional: currentUser?.nombre || '',
      soporte: txt,
      celular: currentUser?.telefono || ''
    });
    Swal.fire({icon:'success',title:'SOLICITUD CARGADA CON ÉXITO',timer:4000,showConfirmButton:false});
    document.getElementById('soporte-text').value='';
    renderInicio(); showView('view-inicio');
  }catch(e){ Swal.fire({icon:'error',title:'Error',text:e.message}); }
});
document.getElementById('soporte-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== DIRECTORIO INSTITUCIONAL (SIN CAMBIOS FUNCIONALES) ================== */
const ICON_DIR_MAPS   = 'https://res.cloudinary.com/dqqeavica/image/upload/v1760108968/ubicacion_zicnod.png';
const ICON_DIR_MAIL   = 'https://res.cloudinary.com/dqqeavica/image/upload/v1766266810/correo_czyyra.webp';
const ICON_DIR_WA     = 'https://res.cloudinary.com/dqqeavica/image/upload/v1759166341/WhatsApp_mljaqm.webp';
const ICON_DIR_TEL    = 'https://res.cloudinary.com/dqqeavica/image/upload/v1759952569/Llamada_hra2ch.webp';
const ICON_DIR_SHARE  = 'https://res.cloudinary.com/dqqeavica/image/upload/v1766267125/compartir_szoxv7.webp';

function normalizePhoneDigits(raw){ return String(raw || '').replace(/\D/g,''); }

function openWhatsAppFromNumber(raw){
  const digits = normalizePhoneDigits(raw);
  if(!digits) return;
  let num = digits;
  if(/^\d{10}$/.test(num)) num = '57' + num;
  const url = 'https://wa.me/' + num;
  window.open(url, '_blank');
}
function openTelFromNumber(raw){
  const digits = normalizePhoneDigits(raw);
  if(!digits) return;
  window.location.href = 'tel:' + digits;
}
function buildShareText(item){
  const lugar    = item.lugar || item.nombre || '';
  const dir      = item.direccion || '';
  const maps     = item.maps || '';
  const correo   = item.correo || '';
  const wa       = item.whatsapp || '';
  const tel      = item.linea || item.telefono || '';

  const waDigits = normalizePhoneDigits(wa);
  const waUrl    = waDigits ? ('wa.me/' + waDigits) : '';

  return (
    '*INFORMACIÓN DE CONTACTO:*\n\n' +
    '*LUGAR:* ' + (lugar || '-') + '\n' +
    '*DIRECCIÓN:* ' + (dir || '-') + '\n' +
    '*UBICACIÓN:* ' + (maps || '-') + '\n' +
    '*CORREO:* ' + (correo || '-') + '\n' +
    '*WHATSAPP:* ' + (waUrl || '-') + '\n' +
    '*LÍNEA:* ' + (tel || '-')
  );
}

function buildClipboardText(item){
  const lugar    = item.lugar || item.nombre || '';
  const dir      = item.direccion || '';
  const correo   = item.correo || '';
  const wa       = item.whatsapp || '';
  const tel      = item.linea || item.telefono || '';

  return (
    'LUGAR: ' + (lugar || '-') + '\n' +
    'DIRECCIÓN: ' + (dir || '-') + '\n' +
    'CORREO: ' + (correo || '-') + '\n' +
    'WHATSAPP: ' + (wa || '-') + '\n' +
    'LÍNEA: ' + (tel || '-')
  );
}

async function showDirectorioShareDialog(item){
  const html =
    '<b>LUGAR:</b> ' + (item.lugar || item.nombre || '-') + '<br>' +
    '<b>DIRECCIÓN:</b> ' + (item.direccion || '-') + '<br>' +
    '<b>CORREO:</b> ' + (item.correo || '-') + '<br>' +
    '<b>WHATSAPP:</b> ' + (item.whatsapp || '-') + '<br>' +
    '<b>LÍNEA:</b> ' + (item.linea || '-');

  const result = await Swal.fire({
    icon:'success',
    title:'Información de Contacto',
    html:html,
    showDenyButton:true,
    showCancelButton:true,
    confirmButtonText:'Copiar Portapapeles',
    denyButtonText:'Compartir',
    cancelButtonText:'Atrás'
  });

  if(result.isConfirmed){
    const text = buildClipboardText(item);
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      }
      await Swal.fire({ icon:'success', title:'Información Copiada', timer:2000, showConfirmButton:false });
    }catch(e){
      await Swal.fire({ icon:'error', title:'No se pudo copiar', text:String(e.message||e) });
    }
    return;
  }

  if(result.isDenied){
    const shareText = buildShareText(item);
    const esMovil = /android|iphone|ipad|mobile/i.test(navigator.userAgent || '');
    const enc = encodeURIComponent(shareText);
    const url = esMovil ? 'whatsapp://send?text=' + enc : 'https://api.whatsapp.com/send?text=' + enc;
    window.open(url,'_blank');
  }
}

function renderDirectorio(items){
  const wrap = document.getElementById('dir-list');
  if(!wrap) return;
  wrap.innerHTML = '';

  if(!items.length){
    const p = document.createElement('p');
    p.className = 'muted center';
    p.textContent = 'No hay contactos institucionales disponibles.';
    wrap.appendChild(p);
    return;
  }

  items.forEach(it => {
    const item = document.createElement('div');
    item.className = 'contact-item';

    const main = document.createElement('div');
    main.className = 'contact-main';

    const nameEl = document.createElement('div');
    nameEl.className = 'contact-name';
    nameEl.textContent = it.lugar || it.nombre || '';

    const addrEl = document.createElement('div');
    addrEl.className = 'contact-address';
    addrEl.textContent = it.direccion || '';

    main.appendChild(nameEl);
    main.appendChild(addrEl);
    item.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'contact-actions-row';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.style.width = 'auto';
    editBtn.style.height = 'auto';
    editBtn.style.padding = '6px 10px';
    editBtn.style.borderRadius = '999px';
    editBtn.style.fontSize = '.75rem';
    editBtn.style.fontWeight = '800';
    editBtn.style.border = '2px solid var(--primary)';
    editBtn.style.background = '#fff';
    editBtn.addEventListener('click', ()=> openDirectorioForEdit(it.id_dir));
    actions.appendChild(editBtn);

    if(it.maps){
      const a = document.createElement('a');
      a.href = it.maps;
      a.target = '_blank';
      a.rel = 'noopener';
      const img = document.createElement('img');
      img.src = ICON_DIR_MAPS;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    if(it.correo){
      const a = document.createElement('a');
      a.href = 'mailto:' + it.correo;
      const img = document.createElement('img');
      img.src = ICON_DIR_MAIL;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    if(it.whatsapp){
      const a = document.createElement('a');
      a.href = 'javascript:void(0)';
      a.addEventListener('click', ()=> openWhatsAppFromNumber(it.whatsapp));
      const img = document.createElement('img');
      img.src = ICON_DIR_WA;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    if(it.linea){
      const a = document.createElement('a');
      a.href = 'javascript:void(0)';
      a.addEventListener('click', ()=> openTelFromNumber(it.linea));
      const img = document.createElement('img');
      img.src = ICON_DIR_TEL;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    const btnShare = document.createElement('button');
    const imgShare = document.createElement('img');
    imgShare.src = ICON_DIR_SHARE;
    imgShare.alt = '';
    btnShare.appendChild(imgShare);
    btnShare.addEventListener('click', ()=> showDirectorioShareDialog(it));
    actions.appendChild(btnShare);

    item.appendChild(actions);
    wrap.appendChild(item);
  });
}

function resetDirectorioForm(){
  document.getElementById('id_dir').value = '';
  document.getElementById('lugarD').value = '';
  document.getElementById('direccionD').value = '';
  document.getElementById('mapsD').value = '';
  document.getElementById('correoD').value = '';
  document.getElementById('whatsappD').value = '';
  document.getElementById('lineaD').value = '';
}

function normalizeOptionalAsSpace(v){
  const s = String(v || '').trim();
  return s ? s : ' ';
}

function validateMapsUrlStrict(u){
  return /^https:\/\/maps\.app\.goo\.gl\//i.test(String(u||'').trim());
}

function validateEmailOptional(v){
  const s = String(v||'').trim();
  if(!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function validate10DigitsOptional(v){
  const s = String(v||'').trim();
  if(!s) return true;
  return /^[0-9]{10}$/.test(s);
}

async function openDirectorioForNew(){
  document.getElementById('dir-form-title').textContent = 'AGREGAR DIRECTORIO';
  resetDirectorioForm();
  showView('view-directorio-form');
}

async function openDirectorioForEdit(id_dir){
  if(!id_dir){
    Swal.fire({icon:'warning', title:'ID inválido'});
    return;
  }
  try{
    const r = await apiGet('getDirectorio', { id_dir });
    if(!r){
      Swal.fire({icon:'info', title:'Registro no encontrado'});
      return;
    }
    document.getElementById('dir-form-title').textContent = 'EDITAR DIRECTORIO';
    document.getElementById('id_dir').value = r.id_dir || '';
    document.getElementById('lugarD').value = r.lugar || '';
    document.getElementById('direccionD').value = r.direccion || '';
    document.getElementById('mapsD').value = r.maps || '';
    document.getElementById('correoD').value = (r.correo && r.correo !== ' ') ? r.correo : '';
    document.getElementById('whatsappD').value = (r.whatsapp && r.whatsapp !== ' ') ? r.whatsapp : '';
    document.getElementById('lineaD').value = (r.linea && r.linea !== ' ') ? r.linea : '';
    showView('view-directorio-form');
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
}

document.getElementById('dir-agregar')?.addEventListener('click', ()=> openDirectorioForNew());
document.getElementById('dir-regresar')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-directorio');
});

document.getElementById('dir-guardar')?.addEventListener('click', async ()=>{
  const id_dir = String(document.getElementById('id_dir').value || '').trim();
  const lugarD = String(document.getElementById('lugarD').value || '').trim();
  const direccionD = String(document.getElementById('direccionD').value || '').trim();
  const mapsD = String(document.getElementById('mapsD').value || '').trim();
  const correoD = String(document.getElementById('correoD').value || '').trim();
  const whatsappD = String(document.getElementById('whatsappD').value || '').trim();
  const lineaD = String(document.getElementById('lineaD').value || '').trim();

  if(!lugarD){
    Swal.fire({icon:'warning', title:'Lugar requerido'});
    return;
  }
  if(!direccionD){
    Swal.fire({icon:'warning', title:'Dirección requerida'});
    return;
  }
  if(!mapsD){
    Swal.fire({icon:'warning', title:'Ubicación requerida'});
    return;
  }
  if(!validateMapsUrlStrict(mapsD)){
    Swal.fire({icon:'warning', title:'Ubicación inválida', text:'Debe iniciar con https://maps.app.goo.gl/'});
    return;
  }
  if(!validateEmailOptional(correoD)){
    Swal.fire({icon:'warning', title:'Correo inválido'});
    return;
  }
  if(!validate10DigitsOptional(whatsappD)){
    Swal.fire({icon:'warning', title:'WhatsApp inválido', text:'Debe tener 10 dígitos.'});
    return;
  }
  if(!validate10DigitsOptional(lineaD)){
    Swal.fire({icon:'warning', title:'Línea inválida', text:'Debe tener 10 dígitos.'});
    return;
  }

  const body = {
    id_dir,
    lugarD,
    direccionD,
    mapsD,
    correoD: normalizeOptionalAsSpace(correoD),
    whatsappD: normalizeOptionalAsSpace(whatsappD),
    lineaD: normalizeOptionalAsSpace(lineaD)
  };

  try{
    const r = await apiPost('guardarDirectorio', body);
    if(!r || !r.success){
      Swal.fire({icon:'error', title:'Error al guardar', text:(r && r.message) ? r.message : 'Intenta nuevamente.'});
      return;
    }
    const list = await apiGet('listDirectorio', {});
    renderDirectorio(Array.isArray(list) ? list : []);
    Swal.fire({icon:'success', title:'Guardado', timer:1200, showConfirmButton:false});
    showView('view-directorio');
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
});

document.getElementById('go-directorio')?.addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);

  if(!currentUser){
    Swal.fire({icon:'warning', title:'Sesión inválida'});
    return;
  }
  try{
    const list = await apiGet('listDirectorio', {});
    renderDirectorio(Array.isArray(list) ? list : []);
    showView('view-directorio');
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
});
document.getElementById('dir-volver')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== PWA AVANZADO (SIN CAMBIOS) ================== */
let deferredPrompt = null;

function isStandalone(){
  const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dmInstalled  = window.matchMedia('(display-mode: installed)').matches;
  const iosStandalone = (window.navigator.standalone === true);
  return dmStandalone || dmInstalled || iosStandalone;
}
function isIOS(){
  return /(iphone|ipad|ipod)/i.test(navigator.userAgent || '');
}
function isMarkedInstalled(){
  try{ return localStorage.getItem('pwaInstalledFlag') === '1'; }catch(_){ return false; }
}
function markInstalled(){
  try{ localStorage.setItem('pwaInstalledFlag', '1'); }catch(_){}
}
function clearInstalledMark(){
  try{ localStorage.removeItem('pwaInstalledFlag'); }catch(_){}
}
async function detectInstalled(){
  if (isStandalone()) return true;
  if (typeof navigator.getInstalledRelatedApps === 'function'){
    try{
      const apps = await navigator.getInstalledRelatedApps();
      const found = apps.some(a =>
        a.platform === 'webapp' &&
        typeof a.url === 'string' &&
        /manifest\.webmanifest$/.test(a.url)
      );
      if (found){
        markInstalled();
        return true;
      } else {
        clearInstalledMark();
      }
    }catch(_){}
  }
  return isMarkedInstalled();
}
function updateInstallButtonsVisibility(){
  const btn1 = document.getElementById('btn-instalar');
  const canPrompt = !!deferredPrompt;
  const installed = isMarkedInstalled() || isStandalone();
  const shouldShow = !installed && (canPrompt || isIOS());
  if(btn1) btn1.style.display = shouldShow ? '' : 'none';
}

window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  updateInstallButtonsVisibility();
});

window.addEventListener('appinstalled', ()=>{
  markInstalled();
  deferredPrompt = null;
  updateInstallButtonsVisibility();
});

document.getElementById('btn-instalar').addEventListener('click', async ()=>{
  if(isIOS()){
    Swal.fire({
      icon:'info',
      title: '¡Para Instalar en tu Iphone!',
      html: `
        <div style="text-align:center; margin-top:8px;">
          <img
            src="https://res.cloudinary.com/dqqeavica/image/upload/v1765745210/instalacion_ios_ysbhnd.gif"
            alt="Instalación de IOS"
            style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
          >
          <div style="margin-top:10px;">
            <b>1.</b> Toca Compartir.<br><b>2.</b> Elige "Agregar a pantalla de inicio".<br><b>3.</b> Confirma "Agregar".
          </div>
        </div>
      `,
    });
    return;
  }
  if(!deferredPrompt){
    Swal.fire({icon:'info',title:'Instalación no disponible todavía'});
    return;
  }

  const dp = deferredPrompt;
  dp.prompt();
  const choice = await dp.userChoice;
  deferredPrompt = null;

  if (choice.outcome === 'accepted'){
    markInstalled();
    Swal.fire({
      icon: 'success',
      title: '¡App instalándose!',
      html: `
        <div style="text-align:center; margin-top:8px;">
          <img
            src="https://res.cloudinary.com/dqqeavica/image/upload/v1765740540/instalacion_lydtcl.gif"
            alt="Instalando app"
            style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
          >
          <div>Debes esperar unos segundos mientras el sistema instala la App.</div>
          <div style="margin-top:10px;">
            <b>Al desaparecer este aviso, puedes salir de esta vista. La App aparecerá en la pantalla principal de este dispositivo.</b>
          </div>
        </div>
      `,
      timer: 12000,
      showConfirmButton: false
    });
  } else {
    Swal.fire({icon:'info',title:'Instalación cancelada'});
  }

  updateInstallButtonsVisibility();
});

async function initPWAVista(){
  const installed = await detectInstalled();
  if (installed){
    showView('view-login');
  } else {
    showView('view-instalar');
    updateInstallButtonsVisibility();
  }
}
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
window.addEventListener('load', initPWAVista);

/* ================== CALENDARIO INSTITUCIONAL (SIN CAMBIOS FUNCIONALES) ================== */
const CAL_API_ACTION_LIST = 'listEventosCalendario';
const CAL_API_ACTION_SAVE = 'guardarEventoCalendario';
const CAL_API_ACTION_GET  = 'getEventoCalendario';

let CAL_EVENTS = [];
let CAL_CURRENT_VIEW = 'month';
let CAL_CURRENT_DATE = new Date();
let CAL_SELECTED_EVENT = null;

const CAL_MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const CAL_WEEKDAYS_SHORT = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

function calPad2(n){ return String(n).padStart(2,'0'); }
function calFormatDMY(d){
  if(!d) return '';
  const dd = calPad2(d.getDate());
  const mm = calPad2(d.getMonth()+1);
  const yy = d.getFullYear();
  return dd + '/' + mm + '/' + yy;
}
function calParseDMY(str){
  if(!str) return null;
  const p = String(str).split('/');
  if(p.length !== 3) return null;
  const d = parseInt(p[0],10);
  const m = parseInt(p[1],10);
  const y = parseInt(p[2],10);
  if(!d || !m || !y) return null;
  const dt = new Date(y,m-1,d);
  if(isNaN(dt.getTime())) return null;
  return dt;
}
function calMinutesFromTimeStr(str){
  if(!str) return 0;
  const p = String(str).split(':');
  const h = parseInt(p[0]||'0',10);
  const m = parseInt(p[1]||'0',10);
  if(isNaN(h) || isNaN(m)) return 0;
  return h*60 + m;
}
function calHMFromAmPm(str){
  if(!str) return {h:0,m:0};
  const s = String(str).trim().toUpperCase();
  const parts = s.split(' ');
  const hm = (parts[0]||'').split(':');
  let h = parseInt(hm[0]||'0',10);
  const m = parseInt(hm[1]||'0',10);
  const ampm = parts[1] || 'AM';
  if(ampm === 'PM' && h < 12) h += 12;
  if(ampm === 'AM' && h === 12) h = 0;
  return {h:isNaN(h)?0:h, m:isNaN(m)?0:m};
}

function calStatusColorClass(estado, secretaria){
  const v = String(secretaria || '').trim().toUpperCase();
  const st = String(estado || '').trim().toUpperCase();

  let base;
  if (v === 'DESPACHO MUNICIPAL') base = 'sec-despacho';
  else if (v === 'SECRETARÍA DE GOBIERNO Y SERVICIOS ADMINISTRATIVOS') base = 'sec-gobierno';
  else if (v === 'SECRETARÍA DE HACIENDA') base = 'sec-hacienda';
  else if (v === 'SECRETARÍA DE EDUCACIÓN, DESARROLLO ECONÓMICO Y SOCIAL') base = 'sec-educacion';
  else if (v === 'SECRETARÍA DE PLANEACIÓN E INFRAESTRUCTRURA') base = 'sec-planeacion';
  else if (v === 'SECRETARÍA DE ASUNTOS AGROPECUARIOS') base = 'sec-agro';
  else if (v === 'SECRETARÍA DE SALUD') base = 'sec-salud';
  else base = 'sec-default';

  if (st === 'COMPLETADO') return 'cal-event-chip ' + base + '-filled';
  if (st === 'PROGRAMADO') return 'cal-event-chip ' + base;
  return 'cal-event-chip ' + base;
}

function calEventMatchesFilter(ev, query){
  if(!query) return true;
  const q = query.toLowerCase();
  return [ev.nombreEvento, ev.secretaria, ev.nombre, ev.lugar, ev.detalles]
    .some(v => String(v||'').toLowerCase().includes(q));
}
function calStartOfWeek(d){
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay();
  const diff = (day + 7 - 0) % 7;
  dt.setDate(dt.getDate() - diff);
  return dt;
}
function calEndOfWeek(d){
  const start = calStartOfWeek(d);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
}
function calUpdateTitle(){
  const titleEl = document.getElementById('cal-title-text');
  if(!titleEl) return;
  if(CAL_CURRENT_VIEW === 'year'){
    titleEl.textContent = CAL_CURRENT_DATE.getFullYear();
    return;
  }
  if(CAL_CURRENT_VIEW === 'week'){
    const start = calStartOfWeek(CAL_CURRENT_DATE);
    const end = calEndOfWeek(CAL_CURRENT_DATE);
    const label = CAL_MONTHS_SHORT[start.getMonth()] + ' ' + start.getDate() +
      ' – ' + CAL_MONTHS_SHORT[end.getMonth()] + ' ' + end.getDate() +
      ' ' + end.getFullYear();
    titleEl.textContent = label;
    return;
  }
  if(CAL_CURRENT_VIEW === 'day'){
    const d = CAL_CURRENT_DATE;
    titleEl.textContent = d.getDate() + ' ' + CAL_MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    return;
  }
  const d = CAL_CURRENT_DATE;
  titleEl.textContent = d.toLocaleDateString('es-CO', { month:'long', year:'numeric' }).toUpperCase();
}
function calEventsOnDay(isoDMY){
  return CAL_EVENTS.filter(ev => ev.fechaEvento === isoDMY);
}
function calRender(){
  const cont = document.getElementById('cal-container');
  if(!cont) return;
  const filterVal = document.getElementById('cal-filter-input')?.value.trim().toLowerCase() || '';
  cont.innerHTML = '';
  calUpdateTitle();

  if(CAL_CURRENT_VIEW === 'month') calRenderMonth(cont, filterVal);
  else if(CAL_CURRENT_VIEW === 'week') calRenderWeek(cont, filterVal);
  else if(CAL_CURRENT_VIEW === 'day') calRenderDay(cont, filterVal);
  else if(CAL_CURRENT_VIEW === 'year') calRenderYear(cont, filterVal);
}

function calRenderMonth(cont, filterVal){
  const header = document.createElement('div');
  header.className = 'cal-weekdays';
  CAL_WEEKDAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = d;
    header.appendChild(el);
  });
  cont.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'cal-month-grid';

  const year = CAL_CURRENT_DATE.getFullYear();
  const month = CAL_CURRENT_DATE.getMonth();
  const firstDay = new Date(year,month,1);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();

  const prevMonthDays = (startWeekDay + 7 - 0) % 7;
  const totalCells = prevMonthDays + daysInMonth;
  const cells = totalCells <= 35 ? 35 : 42;

  const todayDMY = calFormatDMY(new Date());

  for(let i=0; i<cells; i++){
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    const dayOffset = i - prevMonthDays + 1;
    let cellDate;
    let inThisMonth = true;

    if(dayOffset < 1){ cellDate = new Date(year, month, dayOffset); inThisMonth = false; }
    else if(dayOffset > daysInMonth){ cellDate = new Date(year, month, dayOffset); inThisMonth = false; }
    else { cellDate = new Date(year, month, dayOffset); }

    const iso = calFormatDMY(cellDate);
    if(!inThisMonth) cell.classList.add('other-month');

    const headerNum = document.createElement('div');
    headerNum.className = 'cal-day-number';
    if(iso === todayDMY){
      headerNum.classList.add('today');
      headerNum.textContent = cellDate.getDate();
    }else{
      headerNum.textContent = cellDate.getDate();
    }
    cell.appendChild(headerNum);

    const events = calEventsOnDay(iso).filter(ev => calEventMatchesFilter(ev, filterVal));
    events.sort((a,b)=>{
      const ma = calMinutesFromTimeStr(a.horaInicio24 || '');
      const mb = calMinutesFromTimeStr(b.horaInicio24 || '');
      return ma - mb;
    });

    events.forEach(ev => {
      const chip = document.createElement('div');
      chip.className = calStatusColorClass(ev.estado, ev.secretaria);
      chip.classList.add('cal-event-chip');

      const title = document.createElement('span');
      title.className = 'cal-evt-title';
      title.textContent = ev.nombreEvento || '';

      const time = document.createElement('span');
      time.className = 'cal-evt-time';
      time.textContent = (ev.horaInicioAMPM || '') + ' - ' + (ev.horaTerminacionAMPM || '');

      chip.appendChild(title);
      chip.appendChild(time);

      chip.addEventListener('click', ()=> calOpenEventForEdit(ev.codigo));
      cell.appendChild(chip);
    });

    grid.appendChild(cell);
  }
  cont.appendChild(grid);
}

function calRenderDay(cont, filterVal){
  const header = document.createElement('div');
  header.className = 'cal-day-header-row';
  const d = CAL_CURRENT_DATE;
  header.textContent = d.toLocaleDateString('es-CO',{ weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase();
  cont.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-day-body';

  const iso = calFormatDMY(d);
  const events = calEventsOnDay(iso).filter(ev => calEventMatchesFilter(ev, filterVal));
  events.sort((a,b)=>{
    const ma = calMinutesFromTimeStr(a.horaInicio24 || '');
    const mb = calMinutesFromTimeStr(b.horaInicio24 || '');
    return ma - mb;
  });

  if(!events.length){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Sin eventos para este día.';
    body.appendChild(p);
  }else{
    events.forEach(ev => {
      const chip = document.createElement('div');
      chip.className = calStatusColorClass(ev.estado, ev.secretaria);
      chip.classList.add('cal-event-chip');

      const title = document.createElement('span');
      title.className = 'cal-evt-title';
      title.textContent = ev.nombreEvento || '';

      const time = document.createElement('span');
      time.className = 'cal-evt-time';
      time.textContent = (ev.horaInicioAMPM || '') + ' - ' + (ev.horaTerminacionAMPM || '');

      chip.appendChild(title);
      chip.appendChild(time);

      chip.addEventListener('click', ()=> calOpenEventForEdit(ev.codigo));
      body.appendChild(chip);
    });
  }
  cont.appendChild(body);
}

function calRenderWeek(cont, filterVal){
  const start = calStartOfWeek(CAL_CURRENT_DATE);
  const end = calEndOfWeek(CAL_CURRENT_DATE);

  const header = document.createElement('div');
  header.className = 'cal-week-header-row';
  header.textContent = 'Semana del ' +
    start.getDate() + ' ' + CAL_MONTHS_SHORT[start.getMonth()] +
    ' al ' +
    end.getDate() + ' ' + CAL_MONTHS_SHORT[end.getMonth()] +
    ' ' + end.getFullYear();
  cont.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-week-body';

  for(let i=0;i<7;i++){
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = calFormatDMY(d);

    const row = document.createElement('div');
    row.style.borderRadius = '10px';
    row.style.padding = '6px 8px';
    row.style.background = '#f9fafb';
    row.style.marginBottom = '6px';

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.justifyContent = 'space-between';

    const left = document.createElement('span');
    left.style.fontWeight = '700';
    left.style.fontSize = '.8rem';
    left.textContent = CAL_WEEKDAYS_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + CAL_MONTHS_SHORT[d.getMonth()];

    head.appendChild(left);
    row.appendChild(head);

    const evs = calEventsOnDay(iso).filter(ev => calEventMatchesFilter(ev, filterVal));
    evs.sort((a,b)=>{
      const ma = calMinutesFromTimeStr(a.horaInicio24 || '');
      const mb = calMinutesFromTimeStr(b.horaInicio24 || '');
      return ma - mb;
    });

    if(!evs.length){
      const p = document.createElement('p');
      p.className = 'muted';
      p.style.fontSize = '.72rem';
      p.textContent = 'Sin eventos';
      row.appendChild(p);
    }else{
      evs.forEach(ev => {
        const chip = document.createElement('div');
        chip.className = calStatusColorClass(ev.estado, ev.secretaria);
        chip.classList.add('cal-event-chip');

        const title = document.createElement('span');
        title.className = 'cal-evt-title';
        title.textContent = ev.secretaria || '';

        const time = document.createElement('span');
        time.className = 'cal-evt-time';
        time.textContent = (ev.horaInicioAMPM || '') + ' - ' + (ev.horaTerminacionAMPM || '');

        chip.appendChild(title);
        chip.appendChild(time);
        chip.addEventListener('click', ()=> calOpenEventForEdit(ev.codigo));
        row.appendChild(chip);
      });
    }

    body.appendChild(row);
  }

  cont.appendChild(body);
}

function calRenderYear(cont, filterVal){
  const grid = document.createElement('div');
  grid.className = 'cal-year-grid';

  const year = CAL_CURRENT_DATE.getFullYear();
  const eventsByMonth = {};
  CAL_EVENTS.forEach(ev => {
    const d = calParseDMY(ev.fechaEvento);
    if(!d || d.getFullYear() !== year) return;
    const m = d.getMonth();
    if(!eventsByMonth[m]) eventsByMonth[m] = [];
    if(calEventMatchesFilter(ev, filterVal)){
      eventsByMonth[m].push(ev);
    }
  });

  for(let m=0;m<12;m++){
    const box = document.createElement('div');
    box.className = 'cal-year-month';

    const h4 = document.createElement('h4');
    h4.textContent = new Date(year,m,1).toLocaleDateString('es-CO',{ month:'long' }).toUpperCase();
    box.appendChild(h4);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    CAL_WEEKDAYS_SHORT.forEach(d => {
      const th = document.createElement('th');
      th.textContent = d.charAt(0);
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const first = new Date(year,m,1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year,m+1,0).getDate();

    let day = 1;
    let done = false;
    while(!done){
      const tr = document.createElement('tr');
      for(let wd=0; wd<7; wd++){
        const td = document.createElement('td');
        if(wd < startDay && day === 1){
          td.textContent = '';
        }else if(day > daysInMonth){
          td.textContent = '';
          done = true;
        }else{
          td.textContent = day;
          const dmy = calFormatDMY(new Date(year,m,day));
          const hasEvent = (eventsByMonth[m]||[]).some(ev => ev.fechaEvento === dmy);
          if(hasEvent){
            const dot = document.createElement('span');
            dot.className = 'cal-year-dot';
            td.appendChild(dot);
          }
          day++;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    box.appendChild(table);
    grid.appendChild(box);
  }

  cont.appendChild(grid);
}

function calSyncViewButtons(){
  ['cal-view-day','cal-view-week','cal-view-month','cal-view-year'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('active');
  });
  if(CAL_CURRENT_VIEW === 'day') document.getElementById('cal-view-day')?.classList.add('active');
  if(CAL_CURRENT_VIEW === 'week') document.getElementById('cal-view-week')?.classList.add('active');
  if(CAL_CURRENT_VIEW === 'month') document.getElementById('cal-view-month')?.classList.add('active');
  if(CAL_CURRENT_VIEW === 'year') document.getElementById('cal-view-year')?.classList.add('active');
}

document.getElementById('go-calendario')?.addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  await calLoadEvents();
  CAL_CURRENT_VIEW = 'month';
  CAL_CURRENT_DATE = new Date();
  calSyncViewButtons();
  showView('view-calendario');
  calRender();
});

document.getElementById('cal-btn-back')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});
document.getElementById('cal-btn-today')?.addEventListener('click', ()=>{
  CAL_CURRENT_DATE = new Date();
  calRender();
});
document.getElementById('cal-prev')?.addEventListener('click', ()=>{
  if(CAL_CURRENT_VIEW === 'year') CAL_CURRENT_DATE.setFullYear(CAL_CURRENT_DATE.getFullYear()-1);
  else if(CAL_CURRENT_VIEW === 'month') CAL_CURRENT_DATE.setMonth(CAL_CURRENT_DATE.getMonth()-1);
  else if(CAL_CURRENT_VIEW === 'week') CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()-7);
  else if(CAL_CURRENT_VIEW === 'day') CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()-1);
  calRender();
});
document.getElementById('cal-next')?.addEventListener('click', ()=>{
  if(CAL_CURRENT_VIEW === 'year') CAL_CURRENT_DATE.setFullYear(CAL_CURRENT_DATE.getFullYear()+1);
  else if(CAL_CURRENT_VIEW === 'month') CAL_CURRENT_DATE.setMonth(CAL_CURRENT_DATE.getMonth()+1);
  else if(CAL_CURRENT_VIEW === 'week') CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()+7);
  else if(CAL_CURRENT_VIEW === 'day') CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()+1);
  calRender();
});

document.getElementById('cal-view-day')?.addEventListener('click', ()=>{ CAL_CURRENT_VIEW = 'day'; calSyncViewButtons(); calRender(); });
document.getElementById('cal-view-week')?.addEventListener('click', ()=>{ CAL_CURRENT_VIEW = 'week'; calSyncViewButtons(); calRender(); });
document.getElementById('cal-view-month')?.addEventListener('click', ()=>{ CAL_CURRENT_VIEW = 'month'; calSyncViewButtons(); calRender(); });
document.getElementById('cal-view-year')?.addEventListener('click', ()=>{ CAL_CURRENT_VIEW = 'year'; calSyncViewButtons(); calRender(); });

document.getElementById('cal-filter-toggle')?.addEventListener('click', ()=>{
  const input = document.getElementById('cal-filter-input');
  if(!input) return;
  const visible = input.style.display !== 'none';
  if(visible){
    input.style.display = 'none';
    input.value = '';
    calRender();
  }else{
    input.style.display = '';
    input.focus();
  }
});
document.getElementById('cal-filter-input')?.addEventListener('input', ()=> calRender());

async function calLoadEvents(){
  try{
    const list = await apiGet(CAL_API_ACTION_LIST, {});
    CAL_EVENTS = Array.isArray(list) ? list.map(ev => calNormalizeEvent(ev)) : [];
  }catch(e){
    CAL_EVENTS = [];
    Swal.fire({icon:'error',title:'Error cargando calendario',text:String(e.message||e)});
  }
}
function calNormalizeEvent(ev){
  const out = Object.assign({}, ev||{});
  out.codigo = String(out.codigo||'');
  out.fechaEvento = String(out.fechaEvento||'');
  out.nombreEvento = String(out.nombreEvento||'');
  out.secretaria = String(out.secretaria||'');
  out.estado = String(out.estado||'').toUpperCase() || 'PROGRAMADO';
  out.horaInicioAMPM = String(out.horaInicio||'');
  out.horaTerminacionAMPM = String(out.horaTerminacion||'');
  const hi = calHMFromAmPm(out.horaInicioAMPM);
  const hf = calHMFromAmPm(out.horaTerminacionAMPM);
  out.horaInicio24 = calPad2(hi.h) + ':' + calPad2(hi.m);
  out.horaTerminacion24 = calPad2(hf.h) + ':' + calPad2(hf.m);
  return out;
}

document.getElementById('cal-btn-new')?.addEventListener('click', ()=>{
  CAL_SELECTED_EVENT = null;
  calResetEventoForm();
  document.getElementById('evento-title').textContent = 'REGISTRAR EVENTO';
  showView('view-evento');
});
document.getElementById('evento-volver')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-calendario');
});

function calResetEventoForm(){
  document.getElementById('evento-codigo').value = '';
  document.getElementById('nombreEvento').value = '';
  document.getElementById('fechaEvento').value = '';
  document.getElementById('horaInicio').value = '';
  document.getElementById('horaTerminacion').value = '';
  document.getElementById('secretaria').value = '';
  document.getElementById('otros').value = '';
  document.getElementById('lugar').value = '';
  document.getElementById('detalles').value = '';
  document.getElementById('publicacion').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('contacto').value = '';
  document.getElementById('cargo').value = '';
  const checks = document.querySelectorAll('#requerimientos input[type="checkbox"]');
  checks.forEach(ch => ch.checked = false);
}

function calFillEventoForm(ev){
  function ensureDMY(v){
    if (!v) return '';
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())){
      const dd = String(v.getDate()).padStart(2,'0');
      const mm = String(v.getMonth()+1).padStart(2,'0');
      const yy = v.getFullYear();
      return dd + '/' + mm + '/' + yy;
    }
    const s = String(v);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s.trim())) return s.trim();
    const d = new Date(s);
    if (!isNaN(d.getTime())){
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yy = d.getFullYear();
      return dd + '/' + mm + '/' + yy;
    }
    return s;
  }

  document.getElementById('evento-codigo').value = ev.codigo || '';
  document.getElementById('nombreEvento').value = ev.nombreEvento || '';
  document.getElementById('fechaEvento').value = ensureDMY(ev.fechaEvento || '');
  document.getElementById('horaInicio').value = ev.horaInicio24 || '';
  document.getElementById('horaTerminacion').value = ev.horaTerminacion24 || '';
  document.getElementById('secretaria').value = ev.secretaria || '';
  document.getElementById('otros').value = ev.otros || '';
  document.getElementById('lugar').value = ev.lugar || '';
  document.getElementById('detalles').value = ev.detalles || '';
  document.getElementById('publicacion').value = ensureDMY(ev.publicacion || '');
  document.getElementById('nombre').value = ev.nombre || '';
  document.getElementById('contacto').value = ev.contacto || '';
  document.getElementById('cargo').value = ev.cargo || '';

  const checks = document.querySelectorAll('#requerimientos input[type="checkbox"]');
  checks.forEach(ch => {
    const labelVal = ch.value;
    const src = String(ev.requerimientos||'');
    ch.checked = src.indexOf(labelVal) !== -1;
  });
}

async function calOpenEventForEdit(codigo){
  try{
    const data = await apiGet(CAL_API_ACTION_GET, { codigo });
    if(!data){
      Swal.fire({icon:'info',title:'Evento no encontrado'});
      return;
    }
    const ev = calNormalizeEvent(data);
    CAL_SELECTED_EVENT = ev;
    calFillEventoForm(ev);
    document.getElementById('evento-title').textContent = 'EDITAR EVENTO';
    showView('view-evento');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:String(e.message||e)});
  }
}

function calInitSimplePicker(dSelId,mSelId,aSelId){
  const dSel = document.getElementById(dSelId);
  const mSel = document.getElementById(mSelId);
  const aSel = document.getElementById(aSelId);
  if(dSel && !dSel.childElementCount){
    for(let d=1; d<=31; d++){
      const opt = document.createElement('option');
      opt.value = calPad2(d);
      opt.textContent = opt.value;
      dSel.appendChild(opt);
    }
  }
  if(mSel && !mSel.childElementCount){
    const mesesNombres=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    for(let i=0;i<12;i++){
      const opt = document.createElement('option');
      opt.value = calPad2(i+1);
      opt.textContent = mesesNombres[i];
      mSel.appendChild(opt);
    }
  }
  if(aSel && !aSel.childElementCount){
    const fixedYear = 2026;
    const opt = document.createElement('option');
    opt.value = String(fixedYear);
    opt.textContent = String(fixedYear);
    opt.selected = true;
    aSel.appendChild(opt);
  }
}
calInitSimplePicker('evtDia','evtMes','evtAnio');
calInitSimplePicker('pubDia','pubMes','pubAnio');

document.getElementById('fechaEvento')?.addEventListener('click', ()=>{
  const m = document.getElementById('eventoFechaModal');
  if(m){ m.style.display = 'flex'; m.setAttribute('aria-hidden','false'); }
});
document.getElementById('evtFechaCancelar')?.addEventListener('click', ()=>{
  const m = document.getElementById('eventoFechaModal');
  if(m){ m.style.display = 'none'; m.setAttribute('aria-hidden','true'); }
});
document.getElementById('evtFechaOk')?.addEventListener('click', ()=>{
  const d = document.getElementById('evtDia')?.value || '01';
  const m = document.getElementById('evtMes')?.value || '01';
  const y = document.getElementById('evtAnio')?.value || String(new Date().getFullYear());
  document.getElementById('fechaEvento').value = d + '/' + m + '/' + y;
  const modal = document.getElementById('eventoFechaModal');
  if(modal){ modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
});

document.getElementById('publicacion')?.addEventListener('click', ()=>{
  const m = document.getElementById('publicacionFechaModal');
  if(m){ m.style.display = 'flex'; m.setAttribute('aria-hidden','false'); }
});
document.getElementById('pubFechaCancelar')?.addEventListener('click', ()=>{
  const m = document.getElementById('publicacionFechaModal');
  if(m){ m.style.display = 'none'; m.setAttribute('aria-hidden','true'); }
});
document.getElementById('pubFechaOk')?.addEventListener('click', ()=>{
  const d = document.getElementById('pubDia')?.value || '01';
  const m = document.getElementById('pubMes')?.value || '01';
  const y = document.getElementById('pubAnio')?.value || String(new Date().getFullYear());
  document.getElementById('publicacion').value = d + '/' + m + '/' + y;
  const modal = document.getElementById('publicacionFechaModal');
  if(modal){ modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
});

function bindResponsablesQuery(){
  const input = document.getElementById('nombre');
  const list  = document.getElementById('dl-responsables');
  const contactoInput = document.getElementById('contacto');
  if(!input || !list || !contactoInput) return;

  let t = null;

  input.addEventListener('input', ()=>{
    const q = input.value.trim();
    contactoInput.value = '';

    if(t) clearTimeout(t);
    if(!q){ list.innerHTML = ''; return; }

    t = setTimeout(async ()=>{
      try{
        const url = new URL(API_BASE);
        url.search = new URLSearchParams({ action: 'getResponsablesCalendario', query: q }).toString();
        const r = await fetch(url.toString(), { method:'GET' });
        const j = await r.json();
        const data = (j && j.ok && Array.isArray(j.data)) ? j.data : [];

        list.innerHTML = '';
        data.forEach(item=>{
          const opt = document.createElement('option');
          opt.value = item.nombre;
          opt.setAttribute('data-contacto', item.contacto || '');
          list.appendChild(opt);
        });

        rellenarContactoDesdeDatalist(input.value, list, contactoInput);
      }catch(_){}
    }, 200);
  });

  input.addEventListener('change', ()=>{
    rellenarContactoDesdeDatalist(input.value, list, contactoInput);
  });
}
function rellenarContactoDesdeDatalist(valor, list, contactoInput){
  const val = String(valor || '').trim();
  if(!val) return;

  const opt = Array.from(list.querySelectorAll('option')).find(o => o.value === val);
  if(!opt) return;

  const telRaw = opt.getAttribute('data-contacto') || '';
  const tel    = telRaw.replace(/\D/g, '');
  contactoInput.value = tel;
}
bindResponsablesQuery();

document.getElementById('evento-guardar')?.addEventListener('click', async ()=>{
  const codigo = document.getElementById('evento-codigo').value.trim();
  const nombreEvento = document.getElementById('nombreEvento').value.trim();
  const fechaEvento = document.getElementById('fechaEvento').value.trim();
  const horaInicio = document.getElementById('horaInicio').value.trim();
  const horaTerminacion = document.getElementById('horaTerminacion').value.trim();
  const secretaria = document.getElementById('secretaria').value;
  const otros = document.getElementById('otros').value.trim();
  const lugar = document.getElementById('lugar').value.trim();
  const detalles = document.getElementById('detalles').value.trim();
  const publicacion = document.getElementById('publicacion').value.trim();
  const responsable = document.getElementById('nombre').value.trim();
  const contacto = document.getElementById('contacto').value.trim();
  const cargo = document.getElementById('cargo').value.trim();

  if(!nombreEvento || !fechaEvento || !horaInicio || !horaTerminacion || !secretaria){
    Swal.fire({icon:'warning',title:'Campos requeridos',text:'Nombre, fecha, horas y secretaría son obligatorios.'});
    return;
  }

  const checks = document.querySelectorAll('#requerimientos input[type="checkbox"]');
  const reqs = [];
  checks.forEach(ch => { if(ch.checked) reqs.push(ch.value); });
  const requerimientosStr = reqs.join(', ');

  const allFilled = Boolean(
    nombreEvento &&
    fechaEvento &&
    horaInicio &&
    horaTerminacion &&
    secretaria &&
    detalles &&
    requerimientosStr &&
    otros &&
    lugar &&
    publicacion &&
    responsable &&
    contacto &&
    cargo
  );
  const estado = allFilled ? 'COMPLETADO' : 'PROGRAMADO';

  const body = {
    codigo,
    nombreEvento,
    fechaEvento,
    horaInicio,
    horaTerminacion,
    detalles,
    requerimientos: requerimientosStr,
    otros,
    lugar,
    publicacion,
    nombre: responsable,
    contacto,
    secretaria,
    cargo,
    estado
  };

  try{
    const res = await apiPost(CAL_API_ACTION_SAVE, body);
    if(!res || !res.success){
      Swal.fire({icon:'error',title:'Error al guardar',text:res && res.message ? res.message : 'Intenta nuevamente.'});
      return;
    }
    await calLoadEvents();
    Swal.fire({icon:'success',title:'Evento guardado',timer:1800,showConfirmButton:false});
    showView('view-calendario');
    calRender();
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:String(e.message||e)});
  }
});

function normalizeNumber57(raw){
  let num = String(raw || '').replace(/\D/g,'');
  if(!num) return '';
  if(num.length === 10 && !num.startsWith('57')) num = '57' + num;
  if(!(num.length === 12 && num.startsWith('57'))) return '';
  return num;
}
(function bindEventoWhatsappButton(){
  const btn = document.getElementById('contacto-wa-btn');
  const contactoInput = document.getElementById('contacto');
  if(!btn || !contactoInput) return;

  btn.addEventListener('click', ()=>{
    const raw = contactoInput.value || '';
    const tel = normalizeNumber57(raw);
    if(!tel){
      Swal.fire({icon:'info',title:'Sin teléfono válido',text:'No hay un número de contacto válido para este evento.'});
      return;
    }
    window.open('https://wa.me/' + tel,'_blank');
  });
})();

/* ================== BRIEF CALENDARIO (NUEVO) ================== */
const BRIEF_API_LIST = 'listBriefByEstado';
const BRIEF_API_GET  = 'getBrief';
const BRIEF_API_SAVE = 'guardarBrief';

let BRIEF_CURRENT_ESTADO = '';
let BRIEF_CACHE = [];

let BRIEF_CAL_CURRENT_VIEW = 'month';
let BRIEF_CAL_CURRENT_DATE = new Date();

function briefUpdateCalTitle(){
  const titleEl = document.getElementById('brief-cal-title-text');
  if(!titleEl) return;

  if(BRIEF_CAL_CURRENT_VIEW === 'year'){
    titleEl.textContent = BRIEF_CAL_CURRENT_DATE.getFullYear();
    return;
  }
  if(BRIEF_CAL_CURRENT_VIEW === 'week'){
    const start = calStartOfWeek(BRIEF_CAL_CURRENT_DATE);
    const end = calEndOfWeek(BRIEF_CAL_CURRENT_DATE);
    const label = CAL_MONTHS_SHORT[start.getMonth()] + ' ' + start.getDate() +
      ' – ' + CAL_MONTHS_SHORT[end.getMonth()] + ' ' + end.getDate() +
      ' ' + end.getFullYear();
    titleEl.textContent = label;
    return;
  }
  if(BRIEF_CAL_CURRENT_VIEW === 'day'){
    const d = BRIEF_CAL_CURRENT_DATE;
    titleEl.textContent = d.getDate() + ' ' + CAL_MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    return;
  }

  const d = BRIEF_CAL_CURRENT_DATE;
  titleEl.textContent = d.toLocaleDateString('es-CO', { month:'long', year:'numeric' }).toUpperCase();
}

function briefMatchesFilter(item, q){
  if(!q) return true;
  const s = q.toLowerCase();

  const fields = [
    item.brief, item.fechaIngreso, item.estads,
    item.nombreEvents, item.fechaEvents, item.horaIs, item.horaFs,
    item.detalls, item.requerimients, item.otrs, item.lugarEvents,
    item.fechaPubs, item.nombs, item.contacts, item.secrets, item.cargos,
    item.asignado
  ];
  return fields.some(v => String(v||'').toLowerCase().includes(s));
}

function briefSecretariaColorClass(secretaria){
  const v = String(secretaria || '').trim().toUpperCase();
  let base;
  if (v === 'DESPACHO MUNICIPAL') base = 'sec-despacho';
  else if (v === 'SECRETARÍA DE GOBIERNO Y SERVICIOS ADMINISTRATIVOS') base = 'sec-gobierno';
  else if (v === 'SECRETARÍA DE HACIENDA') base = 'sec-hacienda';
  else if (v === 'SECRETARÍA DE EDUCACIÓN, DESARROLLO ECONÓMICO Y SOCIAL') base = 'sec-educacion';
  else if (v === 'SECRETARÍA DE PLANEACIÓN E INFRAESTRUCTRURA') base = 'sec-planeacion';
  else if (v === 'SECRETARÍA DE ASUNTOS AGROPECUARIOS') base = 'sec-agro';
  else if (v === 'SECRETARÍA DE SALUD') base = 'sec-salud';
  else base = 'sec-default';
  return 'cal-event-chip ' + base;
}

function briefEventsOnDay(dmy){
  return BRIEF_CACHE.filter(it => String(it.fechaPubs||'').trim() === dmy);
}

function briefRenderCalendar(){
  const cont = document.getElementById('brief-cal-container');
  if(!cont) return;

  const filterVal = document.getElementById('brief-cal-filter-input')?.value.trim() || '';

  cont.innerHTML = '';
  briefUpdateCalTitle();

  if(BRIEF_CAL_CURRENT_VIEW === 'month') briefRenderMonth(cont, filterVal);
  else if(BRIEF_CAL_CURRENT_VIEW === 'week') briefRenderWeek(cont, filterVal);
  else if(BRIEF_CAL_CURRENT_VIEW === 'day') briefRenderDay(cont, filterVal);
  else if(BRIEF_CAL_CURRENT_VIEW === 'year') briefRenderYear(cont, filterVal);
}

function briefRenderMonth(cont, filterVal){
  const header = document.createElement('div');
  header.className = 'cal-weekdays';
  CAL_WEEKDAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = d;
    header.appendChild(el);
  });
  cont.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'cal-month-grid';

  const year = BRIEF_CAL_CURRENT_DATE.getFullYear();
  const month = BRIEF_CAL_CURRENT_DATE.getMonth();
  const firstDay = new Date(year,month,1);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();

  const prevMonthDays = (startWeekDay + 7 - 0) % 7;
  const totalCells = prevMonthDays + daysInMonth;
  const cells = totalCells <= 35 ? 35 : 42;

  const todayDMY = calFormatDMY(new Date());

  for(let i=0; i<cells; i++){
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    const dayOffset = i - prevMonthDays + 1;
    let cellDate;
    let inThisMonth = true;

    if(dayOffset < 1){ cellDate = new Date(year, month, dayOffset); inThisMonth = false; }
    else if(dayOffset > daysInMonth){ cellDate = new Date(year, month, dayOffset); inThisMonth = false; }
    else { cellDate = new Date(year, month, dayOffset); }

    const iso = calFormatDMY(cellDate);
    if(!inThisMonth) cell.classList.add('other-month');

    const headerNum = document.createElement('div');
    headerNum.className = 'cal-day-number';
    if(iso === todayDMY){
      headerNum.classList.add('today');
      headerNum.textContent = cellDate.getDate();
    }else{
      headerNum.textContent = cellDate.getDate();
    }
    cell.appendChild(headerNum);

    const events = briefEventsOnDay(iso).filter(it => briefMatchesFilter(it, filterVal));
    events.sort((a,b)=>{
      const ma = calMinutesFromTimeStr(briefToHHmm(a.horaIs) || '');
      const mb = calMinutesFromTimeStr(briefToHHmm(b.horaIs) || '');
      return ma - mb;
    });

    events.forEach(it=>{
      const chip = document.createElement('div');
      chip.className = briefSecretariaColorClass(it.secrets);
      chip.classList.add('cal-event-chip');

      const title = document.createElement('span');
      title.className = 'cal-evt-title cal-evt-assigned';
      title.textContent = String(it.asignado || '').trim();

      const time = document.createElement('span');
      time.className = 'cal-evt-time';
      const hi = it.horaIs || '';
      const hf = it.horaFs || '';
      time.textContent = (hi ? hi : '') + (hf ? (' - ' + hf) : '');

      chip.appendChild(title);
      chip.appendChild(time);

      chip.addEventListener('click', ()=> briefOpenDetail(it.brief, BRIEF_CURRENT_ESTADO));
      cell.appendChild(chip);
    });

    grid.appendChild(cell);
  }

  cont.appendChild(grid);
}

function briefRenderDay(cont, filterVal){
  const header = document.createElement('div');
  header.className = 'cal-day-header-row';
  const d = BRIEF_CAL_CURRENT_DATE;
  header.textContent = d.toLocaleDateString('es-CO',{ weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase();
  cont.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-day-body';

  const iso = calFormatDMY(d);
  const events = briefEventsOnDay(iso).filter(it => briefMatchesFilter(it, filterVal));
  events.sort((a,b)=>{
    const ma = calMinutesFromTimeStr(briefToHHmm(a.horaIs) || '');
    const mb = calMinutesFromTimeStr(briefToHHmm(b.horaIs) || '');
    return ma - mb;
  });

  if(!events.length){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Sin solicitudes para este día.';
    body.appendChild(p);
  }else{
    events.forEach(it=>{
      const chip = document.createElement('div');
      chip.className = briefSecretariaColorClass(it.secrets);
      chip.classList.add('cal-event-chip');

      const title = document.createElement('span');
      title.className = 'cal-evt-title cal-evt-assigned';
      title.textContent = String(it.asignado || '').trim();

      const time = document.createElement('span');
      time.className = 'cal-evt-time';
      const hi = it.horaIs || '';
      const hf = it.horaFs || '';
      time.textContent = (hi ? hi : '') + (hf ? (' - ' + hf) : '');

      chip.appendChild(title);
      chip.appendChild(time);

      chip.addEventListener('click', ()=> briefOpenDetail(it.brief, BRIEF_CURRENT_ESTADO));
      body.appendChild(chip);
    });
  }

  cont.appendChild(body);
}

function briefRenderWeek(cont, filterVal){
  const start = calStartOfWeek(BRIEF_CAL_CURRENT_DATE);
  const end = calEndOfWeek(BRIEF_CAL_CURRENT_DATE);

  const header = document.createElement('div');
  header.className = 'cal-week-header-row';
  header.textContent = 'Semana del ' +
    start.getDate() + ' ' + CAL_MONTHS_SHORT[start.getMonth()] +
    ' al ' +
    end.getDate() + ' ' + CAL_MONTHS_SHORT[end.getMonth()] +
    ' ' + end.getFullYear();
  cont.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-week-body';

  for(let i=0;i<7;i++){
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = calFormatDMY(d);

    const row = document.createElement('div');
    row.style.borderRadius = '10px';
    row.style.padding = '6px 8px';
    row.style.background = '#f9fafb';
    row.style.marginBottom = '6px';

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.justifyContent = 'space-between';

    const left = document.createElement('span');
    left.style.fontWeight = '700';
    left.style.fontSize = '.8rem';
    left.textContent = CAL_WEEKDAYS_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + CAL_MONTHS_SHORT[d.getMonth()];

    head.appendChild(left);
    row.appendChild(head);

    const events = briefEventsOnDay(iso).filter(it => briefMatchesFilter(it, filterVal));
    events.sort((a,b)=>{
      const ma = calMinutesFromTimeStr(briefToHHmm(a.horaIs) || '');
      const mb = calMinutesFromTimeStr(briefToHHmm(b.horaIs) || '');
      return ma - mb;
    });

    if(!events.length){
      const p = document.createElement('p');
      p.className = 'muted';
      p.style.fontSize = '.72rem';
      p.textContent = 'Sin solicitudes';
      row.appendChild(p);
    }else{
      events.forEach(it=>{
        const chip = document.createElement('div');
        chip.className = briefSecretariaColorClass(it.secrets);
        chip.classList.add('cal-event-chip');

        const title = document.createElement('span');
        title.className = 'cal-evt-title cal-evt-assigned';
        title.textContent = String(it.asignado || '').trim();

        const time = document.createElement('span');
        time.className = 'cal-evt-time';
        const hi = it.horaIs || '';
        const hf = it.horaFs || '';
        time.textContent = (hi ? hi : '') + (hf ? (' - ' + hf) : '');

        chip.appendChild(title);
        chip.appendChild(time);

        chip.addEventListener('click', ()=> briefOpenDetail(it.brief, BRIEF_CURRENT_ESTADO));
        row.appendChild(chip);
      });
    }

    body.appendChild(row);
  }

  cont.appendChild(body);
}

function briefRenderYear(cont, filterVal){
  const grid = document.createElement('div');
  grid.className = 'cal-year-grid';

  const year = BRIEF_CAL_CURRENT_DATE.getFullYear();
  const eventsByMonth = {};
  BRIEF_CACHE.forEach(it=>{
    const d = calParseDMY(it.fechaPubs);
    if(!d || d.getFullYear() !== year) return;
    const m = d.getMonth();
    if(!eventsByMonth[m]) eventsByMonth[m] = [];
    if(briefMatchesFilter(it, filterVal)) eventsByMonth[m].push(it);
  });

  for(let m=0;m<12;m++){
    const box = document.createElement('div');
    box.className = 'cal-year-month';

    const h4 = document.createElement('h4');
    h4.textContent = new Date(year,m,1).toLocaleDateString('es-CO',{ month:'long' }).toUpperCase();
    box.appendChild(h4);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    CAL_WEEKDAYS_SHORT.forEach(d => {
      const th = document.createElement('th');
      th.textContent = d.charAt(0);
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const first = new Date(year,m,1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year,m+1,0).getDate();

    let day = 1;
    let done = false;
    while(!done){
      const tr = document.createElement('tr');
      for(let wd=0; wd<7; wd++){
        const td = document.createElement('td');
        if(wd < startDay && day === 1){
          td.textContent = '';
        }else if(day > daysInMonth){
          td.textContent = '';
          done = true;
        }else{
          td.textContent = day;
          const dmy = calFormatDMY(new Date(year,m,day));
          const hasEvent = (eventsByMonth[m]||[]).some(it => it.fechaPubs === dmy);
          if(hasEvent){
            const dot = document.createElement('span');
            dot.className = 'cal-year-dot';
            td.appendChild(dot);
          }
          day++;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    box.appendChild(table);
    grid.appendChild(box);
  }

  cont.appendChild(grid);
}

function briefSyncViewButtons(){
  ['brief-cal-view-day','brief-cal-view-week','brief-cal-view-month','brief-cal-view-year'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('active');
  });
  if(BRIEF_CAL_CURRENT_VIEW === 'day') document.getElementById('brief-cal-view-day')?.classList.add('active');
  if(BRIEF_CAL_CURRENT_VIEW === 'week') document.getElementById('brief-cal-view-week')?.classList.add('active');
  if(BRIEF_CAL_CURRENT_VIEW === 'month') document.getElementById('brief-cal-view-month')?.classList.add('active');
  if(BRIEF_CAL_CURRENT_VIEW === 'year') document.getElementById('brief-cal-view-year')?.classList.add('active');
}

function briefEstadoTitle(estado){
  const st = String(estado||'').trim().toUpperCase();
  if(st === 'PENDIENTE') return 'SOLICITUDES PENDIENTES';
  if(st === 'EN PROCESO') return 'SOLICITUDES EN PROCESO';
  if(st === 'REALIZADA') return 'SOLICITUDES REALIZADAS';
  return 'SOLICITUDES';
}

async function briefOpenList(estado){
  BRIEF_CURRENT_ESTADO = String(estado||'').trim().toUpperCase();

  document.getElementById('brief-title').textContent = briefEstadoTitle(BRIEF_CURRENT_ESTADO);
  document.getElementById('brief-cal-filter-input').value = '';
  document.getElementById('brief-cal-filter-input').style.display = 'none';

  showView('view-brief');

  try{
    const list = await apiGet(BRIEF_API_LIST, {
      estado: BRIEF_CURRENT_ESTADO,
      user: currentUser?.nombre || ''
    });
    BRIEF_CACHE = Array.isArray(list) ? list : [];

    if(!BRIEF_CACHE.length){
      const titulo = briefEstadoTitle(BRIEF_CURRENT_ESTADO);
      await Swal.fire({
        icon:'success',
        title: 'No hay ' + titulo,
        text: 'Se irán mostrando una vez se realicen'
      });
      showView('view-inicio');
      return;
    }

    BRIEF_CAL_CURRENT_VIEW = 'month';
    BRIEF_CAL_CURRENT_DATE = new Date();
    briefSyncViewButtons();
    briefRenderCalendar();
  }catch(e){
    BRIEF_CACHE = [];
    document.getElementById('brief-cal-container').innerHTML = '';
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
}

document.getElementById('brief-back')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

document.getElementById('go-brief-pendiente')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  briefOpenList('PENDIENTE');
});
document.getElementById('go-brief-proceso')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  briefOpenList('EN PROCESO');
});
document.getElementById('go-brief-realizada')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  briefOpenList('REALIZADA');
});

document.getElementById('brief-cal-btn-today')?.addEventListener('click', ()=>{
  BRIEF_CAL_CURRENT_DATE = new Date();
  briefRenderCalendar();
});
document.getElementById('brief-cal-prev')?.addEventListener('click', ()=>{
  if(BRIEF_CAL_CURRENT_VIEW === 'year') BRIEF_CAL_CURRENT_DATE.setFullYear(BRIEF_CAL_CURRENT_DATE.getFullYear()-1);
  else if(BRIEF_CAL_CURRENT_VIEW === 'month') BRIEF_CAL_CURRENT_DATE.setMonth(BRIEF_CAL_CURRENT_DATE.getMonth()-1);
  else if(BRIEF_CAL_CURRENT_VIEW === 'week') BRIEF_CAL_CURRENT_DATE.setDate(BRIEF_CAL_CURRENT_DATE.getDate()-7);
  else if(BRIEF_CAL_CURRENT_VIEW === 'day') BRIEF_CAL_CURRENT_DATE.setDate(BRIEF_CAL_CURRENT_DATE.getDate()-1);
  briefRenderCalendar();
});
document.getElementById('brief-cal-next')?.addEventListener('click', ()=>{
  if(BRIEF_CAL_CURRENT_VIEW === 'year') BRIEF_CAL_CURRENT_DATE.setFullYear(BRIEF_CAL_CURRENT_DATE.getFullYear()+1);
  else if(BRIEF_CAL_CURRENT_VIEW === 'month') BRIEF_CAL_CURRENT_DATE.setMonth(BRIEF_CAL_CURRENT_DATE.getMonth()+1);
  else if(BRIEF_CAL_CURRENT_VIEW === 'week') BRIEF_CAL_CURRENT_DATE.setDate(BRIEF_CAL_CURRENT_DATE.getDate()+7);
  else if(BRIEF_CAL_CURRENT_VIEW === 'day') BRIEF_CAL_CURRENT_DATE.setDate(BRIEF_CAL_CURRENT_DATE.getDate()+1);
  briefRenderCalendar();
});

document.getElementById('brief-cal-view-day')?.addEventListener('click', ()=>{ BRIEF_CAL_CURRENT_VIEW = 'day'; briefSyncViewButtons(); briefRenderCalendar(); });
document.getElementById('brief-cal-view-week')?.addEventListener('click', ()=>{ BRIEF_CAL_CURRENT_VIEW = 'week'; briefSyncViewButtons(); briefRenderCalendar(); });
document.getElementById('brief-cal-view-month')?.addEventListener('click', ()=>{ BRIEF_CAL_CURRENT_VIEW = 'month'; briefSyncViewButtons(); briefRenderCalendar(); });
document.getElementById('brief-cal-view-year')?.addEventListener('click', ()=>{ BRIEF_CAL_CURRENT_VIEW = 'year'; briefSyncViewButtons(); briefRenderCalendar(); });

document.getElementById('brief-cal-filter-toggle')?.addEventListener('click', ()=>{
  const input = document.getElementById('brief-cal-filter-input');
  if(!input) return;
  const visible = input.style.display !== 'none';
  if(visible){
    input.style.display = 'none';
    input.value = '';
    briefRenderCalendar();
  }else{
    input.style.display = '';
    input.focus();
  }
});
document.getElementById('brief-cal-filter-input')?.addEventListener('input', ()=> briefRenderCalendar());

/* ================== BRIEF DETALLE (AJUSTES) ================== */
function briefResetDetail(){
  document.getElementById('brief').value = '';
  document.getElementById('fechaIngreso').value = '';

  document.getElementById('fechaSolicitudVisible').value = '';

  document.getElementById('nombreEvents').value = '';
  document.getElementById('fechaEvents').value = '';
  document.getElementById('horaIs').value = '';
  document.getElementById('horaFs').value = '';
  document.getElementById('detalls').value = '';
  document.getElementById('otrs').value = '';
  document.getElementById('lugarEvents').value = '';
  document.getElementById('fechaPubs').value = '';
  document.getElementById('nombs').value = '';
  document.getElementById('contacts').value = '';
  document.getElementById('secrets').value = '';
  document.getElementById('cargos').value = '';
  document.getElementById('estads').value = 'PENDIENTE';

  const checks = document.querySelectorAll('#requerimients input[type="checkbox"]');
  checks.forEach(ch => ch.checked = false);

  /* NUEVO: reset del checkbox enviar mensaje */
  const sendCheck = document.getElementById('sendmsg-check');
  if(sendCheck) sendCheck.checked = false;
  }

function briefReqChecksFromText(text){
  const src = String(text||'');
  const checks = document.querySelectorAll('#requerimients input[type="checkbox"]');
  checks.forEach(ch=>{
    ch.checked = src.indexOf(ch.value) !== -1;
  });
}
function briefReqTextFromChecks(){
  const checks = document.querySelectorAll('#requerimients input[type="checkbox"]');
  const arr = [];
  checks.forEach(ch=>{ if(ch.checked) arr.push(ch.value); });
  return arr.join(', ');
}

function toAmPmFromHHmm(hhmm){
  const s = String(hhmm || '').trim();
  if(!/^\d{2}:\d{2}$/.test(s)) return s;
  const parts = s.split(':');
  let h = parseInt(parts[0],10);
  const m = parts[1];
  if(isNaN(h)) return s;

  const suf = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if(h12 === 0) h12 = 12;

  return String(h12).padStart(2,'0') + ':' + m + ' ' + suf;
}

function briefToHHmm(amPm){
  const s = String(amPm||'').trim().toUpperCase();
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if(!m) return '';
  let h = parseInt(m[1],10);
  const mm = m[2];
  const suf = m[3];
  if(suf === 'PM' && h < 12) h += 12;
  if(suf === 'AM' && h === 12) h = 0;
  return String(h).padStart(2,'0') + ':' + mm;
}

function normalizeDigits(raw){
  return String(raw || '').replace(/\D/g,'');
}

function waLinkFromContact(raw){
  const digits = normalizeDigits(raw);
  if(!digits) return '';
  if(/^\d{10}$/.test(digits)) return 'wa.me/57' + digits;
  if(digits.startsWith('57') && digits.length === 12) return 'wa.me/' + digits;
  return 'wa.me/' + digits;
}

function buildBriefGroupMessage(){
  const nombreEvento = document.getElementById('nombreEvents').value.trim();
  const fechaEvento  = document.getElementById('fechaEvents').value.trim();
  const horaInicio   = toAmPmFromHHmm(document.getElementById('horaIs').value.trim());
  const horaFin      = toAmPmFromHHmm(document.getElementById('horaFs').value.trim());
  const detalles     = document.getElementById('detalls').value.trim();
  const reqText      = briefReqTextFromChecks();
  const otros        = document.getElementById('otrs').value.trim();
  const lugar        = document.getElementById('lugarEvents').value.trim();
  const fechaPub     = document.getElementById('fechaPubs').value.trim();
  const responsable  = document.getElementById('nombs').value.trim();
  const contactoRaw  = document.getElementById('contacts').value.trim();
  const secretaria   = document.getElementById('secrets').value;
  const cargo        = document.getElementById('cargos').value.trim();

  const waLink = waLinkFromContact(contactoRaw);

  return (
    '*Hola equipo, envío datos de solicitud*\n' +
    '*Nombre del Evento.* ' + (nombreEvento || '-') + '\n' +
    '*Fecha* ' + (fechaEvento || '-') + '\n' +
    '*Hora de Inicio:* ' + (horaInicio || '-') + '\n' +
    '*Hora de Terminación:* ' + (horaFin || '-') + '\n' +
    '*Detalles:*\n' + (detalles || '-') + '\n' +
    '*Requerimientos:*\n' + (reqText || '-') + '\n' +
    '*Otros:* ' + (otros || '-') + '\n' +
    '*Lugar del Evento:* ' + (lugar || '-') + '\n' +
    '*Fecha de Publicación:* ' + (fechaPub || '-') + '\n' +
    '*Responsable:* ' + (responsable || '-') + '\n' +
    '*Contacto:* ' + (waLink || '-') + '\n' +
    '*Secretaría:* ' + (secretaria || '-') + '\n' +
    '*Cargo:* ' + (cargo || '-')
  );
}

/* CAMBIO #1: DETALLES A GRUPO -> enviar MISMO mensaje al grupo fijo (BuilderBot) */
document.getElementById('brief-share-group')?.addEventListener('click', async ()=>{
  const msg = buildBriefGroupMessage();
  sendBuilderbotMessage(BRIEF_GROUP_ID, msg);

  Swal.fire({
    icon: 'success',
    title: 'Detalles enviados',
    timer: 2000,
    showConfirmButton: false
  });
});

function briefFillDetail(d){
  briefResetDetail();

  document.getElementById('brief').value = d.brief || '';
  document.getElementById('fechaIngreso').value = d.fechaIngreso || '';
  document.getElementById('fechaSolicitudVisible').value = d.fechaIngreso || '';

  document.getElementById('nombreEvents').value = d.nombreEvents || '';
  document.getElementById('fechaEvents').value = d.fechaEvents || '';

 document.getElementById('horaIs').value = briefToHHmm(d.horaIs || '');
  document.getElementById('horaFs').value = briefToHHmm(d.horaFs || '');

  document.getElementById('detalls').value = d.detalls || '';
  document.getElementById('otrs').value = d.otrs || '';
  document.getElementById('lugarEvents').value = d.lugarEvents || '';
  document.getElementById('fechaPubs').value = d.fechaPubs || '';
  document.getElementById('nombs').value = d.nombs || '';
  document.getElementById('contacts').value = d.contacts || '';
  document.getElementById('secrets').value = d.secrets || '';
  document.getElementById('cargos').value = d.cargos || '';
  document.getElementById('estads').value = String(d.estads||'').trim().toUpperCase() || 'PENDIENTE';

  briefReqChecksFromText(d.requerimients || '');

  const asignadoWrap = document.getElementById('assign-wrap');
  const asignadoSelect = document.getElementById('asignadoSelect');

  if(asignadoSelect){
    asignadoSelect.innerHTML = '';
    BRIEF_ASSIGNEES.forEach(n=>{
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      asignadoSelect.appendChild(opt);
    });

    const selected = String(d.asignado || '')
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean)
      .map(s=>s.toUpperCase());

    Array.from(asignadoSelect.options).forEach(o=>{
      o.selected = selected.includes(String(o.value||'').toUpperCase());
    });

   // Si ya existe una instancia previa de Choices, destruirla antes de crear otra
if (window.__choicesAsignado && typeof window.__choicesAsignado.destroy === 'function'){
  try { window.__choicesAsignado.destroy(); } catch(e) {}
  window.__choicesAsignado = null;
}

if(window.Choices){
  window.__choicesAsignado = new Choices(asignadoSelect, {
    removeItemButton: true,
    shouldSort: false,
    placeholder: true,
    placeholderValue: 'Selecciona uno o varios'
  });
}
  }

 if(window.__choicesAsignado){
     const selectedVals = String(d.asignado || '')
       .split(',')
       .map(s=>s.trim())
       .filter(Boolean)
       .map(s=>s.toUpperCase());

     window.__choicesAsignado.setChoiceByValue(selectedVals);
   }

  if(asignadoWrap){
    if(userCanEditAssignedField()){
      asignadoWrap.classList.remove('hidden');
    }else{
      asignadoWrap.classList.add('hidden');
    }
  }

  setBriefDetailEditMode();
}

async function briefOpenDetail(briefId, returnEstado){
  document.getElementById('brief-detail-title').textContent = 'REVISAR SOLICITUD';
  showView('view-brief-detail');

  try{
    const data = await apiGet(BRIEF_API_GET, { brief: briefId });
    if(!data){
      Swal.fire({icon:'info', title:'No encontrado', text:'La solicitud ya no existe.'});
      showView('view-brief');
      return;
    }
    briefFillDetail(data);
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
    showView('view-brief');
  }
}

document.getElementById('brief-detail-back')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  if(BRIEF_CURRENT_ESTADO){
    briefOpenList(BRIEF_CURRENT_ESTADO);
  }else{
    showView('view-inicio');
  }
});

(function bindBriefWhatsapp(){
  const btn = document.getElementById('brief-wa-btn');
  const input = document.getElementById('contacts');
  if(!btn || !input) return;

  btn.addEventListener('click', ()=>{
    const raw = input.value || '';
    const digits = String(raw).replace(/\D/g,'');
    if(!digits){
      Swal.fire({icon:'info', title:'Sin teléfono', text:'No hay un número válido.'});
      return;
    }
    let num = digits;
    if(/^\d{10}$/.test(num)) num = '57' + num;
    if(!(num.length === 12 && num.startsWith('57'))){
      Swal.fire({icon:'info', title:'Número inválido', text:'Debe ser 10 dígitos (Colombia) o venir con 57.'});
      return;
    }
    window.open('https://wa.me/' + num, '_blank');
  });
})();

function getAsignadoSelectedCsv(){
  if(!userCanEditAssignedField()) return null;

  const sel = document.getElementById('asignadoSelect');
  if(!sel) return '';
  const vals = Array.from(sel.selectedOptions || []).map(o=>String(o.value||'').trim()).filter(Boolean);
  return vals.join(', ');
}

/* CAMBIO #2: al guardar, si "Enviar mensaje" está marcado (solo admins) y hay asignados,
   consultar teléfonos en backend y enviar WhatsApp 1x1 con espera 2s */
document.getElementById('brief-save')?.addEventListener('click', async ()=>{
  const brief = document.getElementById('brief').value.trim();
  if(!brief){
    Swal.fire({icon:'warning', title:'ID inválido'});
    return;
  }

  const canFullEdit = userIsBriefAdmin();

  const body = {
    brief,
    estads: document.getElementById('estads').value
  };

  if(canFullEdit){
    body.fechaIngreso = document.getElementById('fechaIngreso').value.trim();
    body.nombreEvents = document.getElementById('nombreEvents').value.trim();
    body.fechaEvents = document.getElementById('fechaEvents').value.trim();
     body.horaIs = toAmPmFromHHmm(document.getElementById('horaIs').value.trim());
    body.horaFs = toAmPmFromHHmm(document.getElementById('horaFs').value.trim());
    body.detalls = document.getElementById('detalls').value.trim();
    body.requerimients = briefReqTextFromChecks();
    body.otrs = document.getElementById('otrs').value.trim();
    body.lugarEvents = document.getElementById('lugarEvents').value.trim();
    body.fechaPubs = document.getElementById('fechaPubs').value.trim();
    body.nombs = document.getElementById('nombs').value.trim();
    body.contacts = document.getElementById('contacts').value.trim();
    body.secrets = document.getElementById('secrets').value;
    body.cargos = document.getElementById('cargos').value.trim();
  }

  const asignadoCsv = getAsignadoSelectedCsv();
  if(asignadoCsv !== null){
    body.asignado = asignadoCsv;
  }

  if(!body.estads){
    Swal.fire({icon:'warning', title:'Estado requerido'});
    return;
  }

  const sendCheck = document.getElementById('sendmsg-check');
  const wantsSend = !!(sendCheck && sendCheck.checked && userIsBriefAdmin());
  const hasAssigned = !!(body.asignado && String(body.asignado).trim());

  try{
    const r = await apiPost(BRIEF_API_SAVE, body);
    if(!r || !r.success){
      Swal.fire({icon:'error', title:'Error', text:'No se pudo guardar.'});
      return;
    }

    // Solo si check marcado y hay al menos un asignado
    if(wantsSend && hasAssigned){
      try{
        // pide al backend resolver teléfonos por nombres (Col C=nombre, Col D=telefono) en PRENSA
        const resolved = await apiGet('getTelefonosPrensaByNombres', { nombres: body.asignado });

        const list = Array.isArray(resolved) ? resolved : [];
        if(list.length){
          for(const it of list){
            const nombre = String(it?.nombre || '').trim();
            const telRaw = String(it?.telefono || '').trim();
            const tel = normalizeWhatsApp57(telRaw);

            if(tel){
             const fechaPubRaw = String(body.fechaPubs || '').trim();
const mesesNombresMsg = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function formatFechaPubMsg(dmy){
  if(!dmy) return '';
  const p = dmy.split('/');
  if(p.length !== 3) return dmy;
  const d = parseInt(p[0],10);
  const m = parseInt(p[1],10);
  if(!d || !m || m < 1 || m > 12) return dmy;
  return d + ' de ' + mesesNombresMsg[m-1];
}
const fechaPub = formatFechaPubMsg(fechaPubRaw);

const msg =
  'Hola *' + nombre + '*\n' +
  'He realizado o editado una asignación en la App\n' +
  '> Encuéntrala el día *' + fechaPub + '*\n\n' +
  'Cordialmente,\n\n' +
  '*' + (currentUser?.nombre || '') + '*';

              sendBuilderbotMessage(tel, msg);
              await sleepMs(2000);
            }
          }
        }
      }catch(e){
        // No romper el flujo principal: el guardado ya ocurrió
        console.warn('Error enviando mensajes asignados:', e);
      }
    }

      // Return to the list the user came from, not necessarily the new estado
    await briefOpenList(BRIEF_CURRENT_ESTADO);

    Swal.fire({icon:'success', title:'Guardado', timer:1400, showConfirmButton:false});
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
});
