(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `.ea-access{position:fixed;left:12px;bottom:12px;z-index:10000;font:14px system-ui,sans-serif}.ea-access button,.ea-access input,.ea-access select{font:inherit}.ea-access-toggle{border:1px solid #d9bd99;border-radius:999px;background:#fffaf2;color:#583622;padding:10px 15px;box-shadow:0 3px 14px #38251b25;cursor:pointer}.ea-access-panel{width:min(360px,calc(100vw - 24px));max-height:75vh;overflow:auto;margin-bottom:8px;padding:16px;border:1px solid #d9bd99;border-radius:16px;background:#fffaf2;color:#38251b;box-shadow:0 8px 24px #38251b30}.ea-access-panel[hidden]{display:none}.ea-access-panel label{display:block;margin:10px 0}.ea-access-panel input,.ea-access-panel select{width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #cbb49c;border-radius:8px;background:white}.ea-access-panel button{margin:5px 5px 5px 0;padding:8px 12px;border:1px solid #795038;border-radius:8px;background:#795038;color:white;cursor:pointer}.ea-access-panel p{line-height:1.4}.ea-access-panel .ea-muted{font-size:12px;color:#6b5447}`;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.className = 'ea-access';
  root.innerHTML = `<div class="ea-access-panel" hidden><strong>Expressarte · acesso e IA</strong><div class="ea-status" role="status"></div><form class="ea-login"><label>E-mail do administrador<input name="email" type="email" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Entrar</button></form><div class="ea-session" hidden><p>Você entrou como <b class="ea-email"></b>.</p><button class="ea-logout">Sair</button></div><hr><div class="ea-admin"><strong>Assistente de câmera 3D</strong><p>Abra o gerador de capinhas, escolha Personalizado, informe as medidas e carregue a foto da traseira. A IA sugere o recorte da câmera; confira antes de exportar.</p><label>Provedor<select class="ea-provider"><option value="openai">ChatGPT / OpenAI</option><option value="anthropic">Claude / Anthropic</option></select></label><label>Sua chave de API (visitantes precisam da própria chave)<input class="ea-key" type="password" autocomplete="off" placeholder="Chave usada só nesta solicitação"></label><button class="ea-analyze">Analisar foto da capinha</button><p class="ea-muted">A foto é enviada ao provedor escolhido quando você clica em analisar. A chave não fica salva no navegador. Administradores podem usar a chave configurada no servidor.</p></div></div><button class="ea-access-toggle" aria-expanded="false">🔑 Administrador / IA</button>`;
  document.body.appendChild(root);
  const panel = root.querySelector('.ea-access-panel');
  const toggle = root.querySelector('.ea-access-toggle');
  const status = root.querySelector('.ea-status');
  const login = root.querySelector('.ea-login');
  const session = root.querySelector('.ea-session');
  function message(s) { status.textContent = s; }
  async function api(url, body) {
    const r = await fetch(url, body === undefined ? {credentials:'same-origin'} : {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const j = await r.json();
    if (!r.ok) throw Error(j.error || 'Erro na solicitação.');
    return j;
  }
  async function refresh() {
    try {
      const s = await api('/api/session');
      login.hidden = s.authenticated;
      session.hidden = !s.authenticated;
      root.querySelector('.ea-email').textContent = s.email || '';
      toggle.textContent = s.authenticated ? '🔑 Administrador / IA' : '🔑 Entrar / IA';
      return true;
    } catch (_) {
      message('O acesso de administrador requer o servidor Expressarte.');
      login.hidden = true;
      session.hidden = true;
      return false;
    }
  }
  toggle.addEventListener('click', async () => { panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) await refresh(); });
  login.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(login));
    try { await api('/api/login', data); login.reset(); message('Entrada autorizada.'); await refresh(); }
    catch (err) { message(err.message); }
  });
  root.querySelector('.ea-logout').addEventListener('click', async () => { await api('/api/logout', {}); message('Você saiu.'); await refresh(); });
  root.querySelector('.ea-analyze').addEventListener('click', async () => {
    const file = document.querySelector('#pcReference')?.files?.[0];
    const fields = ['pcCustomW','pcCustomL','pcCustomX','pcCustomY','pcCustomCW','pcCustomCH'].map(id => document.getElementById(id));
    const [w,l] = fields.map(el => Number(el?.value));
    if (location.hash !== '#phonecase' || !document.querySelector('input[name="pcBrand"][value="custom"]:checked')) return message('Abra o gerador de capinhas e escolha Personalizado.');
    if (!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) return message('Escolha uma foto PNG, JPEG ou WebP de até 4 MB.');
    if (!(w >= 35 && l >= 50)) return message('Informe a largura e altura reais do aparelho antes da análise.');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        message('Analisando foto…');
        const result = await api('/api/vision', {provider:root.querySelector('.ea-provider').value, key:root.querySelector('.ea-key').value, image:reader.result});
        root.querySelector('.ea-key').value = '';
        const c = result.camera;
        [c.left*w/100,c.top*l/100,c.width*w/100,c.height*l/100].forEach((v,i) => { fields[i+2].value = v.toFixed(1); fields[i+2].dispatchEvent(new Event('input',{bubbles:true})); fields[i+2].dispatchEvent(new Event('change',{bubbles:true})); });
        message('Recorte sugerido. Confira o contorno dourado, a posição e a saliência da câmera antes de gerar o STL.');
      } catch (err) { message(err.message); }
    };
    reader.readAsDataURL(file);
  });
})();
