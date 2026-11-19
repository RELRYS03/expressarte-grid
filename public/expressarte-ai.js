(function () {
  'use strict';
  const css = document.createElement('style');
  css.textContent = `.ea-robot{position:fixed;right:12px;bottom:12px;z-index:10000;color:#38251b;font:14px/1.4 system-ui,sans-serif}.ea-robot *{box-sizing:border-box}.ea-robot button,.ea-robot input,.ea-robot textarea,.ea-robot select{font:inherit}.ea-toggle{float:right;border:1px solid #d9bd99;border-radius:10px;background:#fffaf2;padding:10px;cursor:pointer}.ea-panel{width:min(370px,calc(100vw - 24px));height:min(550px,calc(100dvh - 70px));display:flex;flex-direction:column;margin-bottom:8px;padding:14px;border:1px solid #d9bd99;border-radius:16px;background:#fffdf9;box-shadow:0 8px 24px #38251b30}.ea-panel[hidden],.ea-auth[hidden],.ea-session[hidden],.ea-admin[hidden],.ea-phone[hidden],.ea-chat-form[hidden]{display:none!important}.ea-head{display:flex;gap:8px;align-items:center}.ea-head b{flex:1}.ea-head button{border:0;background:none}.ea-history{flex:1;overflow:auto;margin:10px 0}.ea-bubble{max-width:95%;margin:8px 0;padding:9px 11px;border-radius:12px;background:#f2e4d2;white-space:pre-wrap;overflow-wrap:anywhere}.ea-bubble.user{margin-left:auto;background:#795038;color:white}.ea-phone{border:1px solid #d9bd99;padding:7px;border-radius:8px}.ea-robot input,.ea-robot textarea,.ea-robot select{width:100%;padding:8px;margin:3px 0;border:1px solid #cbb49c;border-radius:8px;background:white}.ea-chat-form{display:flex;gap:5px}.ea-chat-form textarea{min-height:45px;max-height:100px;resize:vertical}.ea-primary{padding:7px 10px;border:0;border-radius:8px;background:#795038;color:white;cursor:pointer}.ea-robot button:disabled{opacity:.6}.ea-robot details{margin:7px 0;font-size:12px}.ea-robot summary{cursor:pointer}.ea-note,.ea-feedback{font-size:12px;color:#6b5447}.ea-feedback{min-height:16px}`;
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.className = 'ea-robot';
  root.innerHTML = `<div class="ea-panel" hidden><div class="ea-head"><span>🤖</span><b>Robô Expressarte</b><button class="ea-close" aria-label="Fechar">✕</button></div><div class="ea-history" role="log" aria-live="polite"><div class="ea-bubble">Oi! O que posso ajudar?</div></div><div class="ea-phone" hidden><span class="ea-phone-text"></span><br><button class="ea-primary ea-apply">Abrir gerador com estas medidas</button></div><div class="ea-auth"><p class="ea-note">Entre ou crie uma conta para conversar.</p><form class="ea-login"><input name="email" type="email" autocomplete="username" placeholder="E-mail" required><input name="password" type="password" autocomplete="current-password" minlength="12" placeholder="Senha (mínimo 12 caracteres)" required><button class="ea-primary" type="submit">Entrar</button></form><button class="ea-primary ea-signup" type="button">Criar conta com esses dados</button></div><div class="ea-session" hidden><span class="ea-identity"></span> <button class="ea-logout">Sair</button></div><form class="ea-chat-form" hidden><textarea maxlength="2000" placeholder="O que posso ajudar?" aria-label="Mensagem para o robô" required></textarea><button class="ea-primary" type="submit">Enviar</button></form><details><summary>Conectar minha própria chave de IA (opcional)</summary><select class="ea-provider" aria-label="Provedor"><option value="openai">OpenAI / ChatGPT</option><option value="anthropic">Anthropic / Claude</option></select><input class="ea-key" type="password" autocomplete="off" placeholder="Chave para esta solicitação"><p class="ea-note">Sem chave, o robô orienta gratuitamente. O provedor externo pode cobrar pelo uso da sua chave. A chave não é salva.</p></details><details><summary>Foto para a capinha</summary><input type="file" class="ea-photo" accept="image/png,image/jpeg,image/webp"><p class="ea-note">A foto da traseira é usada no gerador para marcar a câmera. Informe também as medidas reais. Fotos acima de 1 MB devem ser carregadas diretamente no gerador.</p><button class="ea-primary ea-photo-open">Abrir gerador de capinhas</button></details><div class="ea-admin" hidden><b>Área do administrador</b><p class="ea-note">A edição do código é restrita ao proprietário no GitHub. Conversar com a IA não altera o site automaticamente.</p></div><div class="ea-feedback" role="status"></div></div><button class="ea-toggle" aria-expanded="false" aria-label="Abrir o Robô Expressarte">🤖 IA</button>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  let phone = null;
  const feedback = value => $('.ea-feedback').textContent = value;
  async function api(path, data) {
    const options = data === undefined ? {credentials:'same-origin'} : {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)};
    const response = await fetch(path, options);
    const json = await response.json();
    if (!response.ok) throw Error(json.error || 'Não foi possível concluir.');
    return json;
  }
  async function refresh() {
    try {
      const user = await api('/api/session');
      $('.ea-auth').hidden = user.authenticated;
      $('.ea-session').hidden = !user.authenticated;
      $('.ea-chat-form').hidden = !user.authenticated;
      $('.ea-admin').hidden = !user.admin;
      $('.ea-identity').textContent = (user.admin ? 'Administrador: ' : '') + (user.email || '');
    } catch (_) { feedback('A conversa requer o servidor Expressarte. O gerador gratuito segue disponível.'); }
  }
  function toggle(open) {
    const show = open === undefined ? $('.ea-panel').hidden : open;
    $('.ea-panel').hidden = !show;
    $('.ea-toggle').setAttribute('aria-expanded', String(show));
    if (show) refresh();
  }
  $('.ea-toggle').onclick = () => toggle();
  $('.ea-close').onclick = () => toggle(false);
  async function authenticate(path) {
    try {
      await api(path, Object.fromEntries(new FormData($('.ea-login'))));
      $('.ea-login').reset();
      feedback(path === '/api/signup' ? 'Conta criada.' : 'Você entrou.');
      await refresh();
    } catch (err) { feedback(err.message); }
  }
  $('.ea-login').onsubmit = event => { event.preventDefault(); authenticate('/api/login'); };
  $('.ea-signup').onclick = () => authenticate('/api/signup');
  $('.ea-logout').onclick = async () => { await api('/api/logout', {}); await refresh(); feedback('Você saiu.'); };
  function bubble(value, user) {
    const el = document.createElement('div');
    el.className = 'ea-bubble' + (user ? ' user' : '');
    el.textContent = value;
    $('.ea-history').appendChild(el);
    $('.ea-history').scrollTop = $('.ea-history').scrollHeight;
  }
  $('.ea-chat-form').onsubmit = async event => {
    event.preventDefault();
    const input = $('.ea-chat-form textarea');
    const value = input.value.trim();
    if (!value) return;
    const button = $('.ea-chat-form button');
    button.disabled = true;
    feedback('Pensando…');
    try {
      const result = await api('/api/chat', {message:value,provider:$('.ea-provider').value,key:$('.ea-key').value});
      input.value = '';
      $('.ea-key').value = '';
      bubble(value, true);
      bubble(result.reply, false);
      phone = result.phone;
      $('.ea-phone').hidden = !phone;
      if (phone) $('.ea-phone-text').textContent = `Medidas: ${phone.L} × ${phone.W} × ${phone.T} mm`;
      feedback(result.mode === 'local' ? 'Orientação local gratuita.' : 'Resposta por ' + result.mode + '.');
    } catch (err) { feedback(err.message); }
    finally { button.disabled = false; }
  };
  function applyPhone(spec) {
    const brand = document.querySelector('input[name="pcBrand"][value="custom"]');
    if (!brand || !document.getElementById('pcCustomW')) return false;
    location.hash = 'phonecase';
    brand.click();
    for (const [id,value] of Object.entries({pcCustomName:spec.name,pcCustomL:spec.L,pcCustomW:spec.W,pcCustomT:spec.T})) {
      const el = document.getElementById(id);
      if (el) { el.value = value; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
    }
    return true;
  }
  $('.ea-apply').onclick = () => {
    if (!phone) return;
    if (applyPhone(phone)) { feedback('Medidas preenchidas. Confira tudo antes de exportar.'); toggle(false); }
    else { sessionStorage.setItem('expressarte.phone.draft', JSON.stringify(phone)); location.href = '/?lang=pt#phonecase'; }
  };
  const draft = sessionStorage.getItem('expressarte.phone.draft');
  if (draft) {
    sessionStorage.removeItem('expressarte.phone.draft');
    try {
      const spec = JSON.parse(draft);
      let count = 0;
      const timer = setInterval(() => { if (applyPhone(spec) || ++count > 30) clearInterval(timer); }, 250);
    } catch (_) {}
  }
  function applyPhoto(data) {
    const target = document.getElementById('pcReference');
    if (!target) return false;
    const brand = document.querySelector('input[name="pcBrand"][value="custom"]');
    if (brand) brand.click();
    const [header, encoded] = data.split(',');
    const mime = header.slice(5).replace(';base64', '');
    const raw = atob(encoded);
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    const file = new File([bytes], 'referencia.' + (mime === 'image/png' ? 'png' : 'jpg'), {type:mime});
    const transfer = new DataTransfer();
    transfer.items.add(file);
    target.files = transfer.files;
    target.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  }
  const photoDraft = sessionStorage.getItem('expressarte.phone.photo');
  if (photoDraft) {
    sessionStorage.removeItem('expressarte.phone.photo');
    let count = 0;
    const timer = setInterval(() => { if (applyPhoto(photoDraft) || ++count > 30) clearInterval(timer); }, 250);
  }
  $('.ea-photo-open').onclick = () => {
    const file = $('.ea-photo').files[0];
    const go = data => {
      if (!document.getElementById('pcReference')) {
        if (data) sessionStorage.setItem('expressarte.phone.photo', data);
        location.href = '/?lang=pt#phonecase';
      } else {
        location.hash = 'phonecase';
        const brand = document.querySelector('input[name="pcBrand"][value="custom"]');
        if (brand) brand.click();
        if (data) applyPhoto(data);
        toggle(false);
        document.getElementById('pcReference').scrollIntoView({block:'center'});
      }
    };
    if (!file) return go(null);
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 1024 * 1024) return feedback('Escolha uma foto PNG, JPEG ou WebP de até 1 MB, ou carregue-a diretamente no gerador.');
    const reader = new FileReader();
    reader.onload = () => go(reader.result);
    reader.readAsDataURL(file);
  };
})();
