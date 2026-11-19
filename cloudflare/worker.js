// Expressarte Grid on Cloudflare: static assets, account sessions and optional AI.
const ADMIN_EMAILS = new Map([
  ['relrysalves@gmail.com', 'ADMIN_HASH_RELRYSALVES'],
  ['relrys17@gmail.com', 'ADMIN_HASH_RELRYS17'],
]);
const te = new TextEncoder();
const MAX_JSON = 6 * 1024 * 1024;
const DAY = 86400;

function response(status, body, cookie) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  if (cookie) headers['set-cookie'] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

function decode64(value) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

function encode64(value) {
  return btoa(String.fromCharCode(...value));
}

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', te.encode(value));
  return encode64(new Uint8Array(bytes));
}

async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bytes = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
  return `pbkdf2$150000$${encode64(salt)}$${encode64(new Uint8Array(bytes))}`;
}

async function passwordValid(password, encoded) {
  try {
    const [scheme, rounds, salt64, hash64] = encoded.split('$');
    if (scheme !== 'pbkdf2' || rounds !== '150000') return false;
    const salt = decode64(salt64), expected = decode64(hash64);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256));
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch (_) { return false; }
}

async function jsonRequest(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw Error('Envie JSON.');
  if (Number(request.headers.get('content-length') || 0) > MAX_JSON) throw Error('Solicitação muito grande.');
  const text = await request.text();
  if (!text || text.length > MAX_JSON) throw Error('Dados inválidos.');
  return JSON.parse(text);
}

function tokenFrom(request) {
  return request.headers.get('cookie')?.match(/(?:^|;\s*)expressarte_session=([^;]+)/)?.[1] || '';
}

async function session(request, env) {
  const token = tokenFrom(request);
  if (!token) return null;
  const hash = await digest(token);
  const row = await env.DB.prepare('SELECT email, is_admin, expires_at FROM sessions WHERE token_hash=?').bind(hash).first();
  if (!row || row.expires_at <= Math.floor(Date.now() / 1000)) return null;
  return { email: row.email, admin: Boolean(row.is_admin) };
}

function cookie(token, maxAge) {
  return `expressarte_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function auth(request, env, signup) {
  const data = await jsonRequest(request);
  const email = String(data.email || '').trim().toLowerCase();
  const password = String(data.password || '');
  if (!validEmail(email) || password.length < 12 || password.length > 256) return response(400, { error: 'Informe e-mail válido e senha de 12 a 256 caracteres.' });
  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const attempts = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip=? AND attempted_at>?').bind(ip, now - 900).first();
  if (attempts.n >= 8) return response(429, { error: 'Muitas tentativas. Aguarde 15 minutos.' });
  const admin = ADMIN_EMAILS.has(email);
  if (signup) {
    if (admin) return response(403, { error: 'Conta de administrador reservada. Configure a senha fora do site.' });
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM signup_attempts WHERE ip=? AND attempted_at>?').bind(ip, now - 3600).first();
    if (recent.n >= 4) return response(429, { error: 'Limite de cadastros atingido. Tente novamente mais tarde.' });
    const existing = await env.DB.prepare('SELECT 1 FROM users WHERE email=?').bind(email).first();
    if (existing) return response(409, { error: 'Este e-mail já possui cadastro.' });
    await env.DB.prepare('INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)').bind(email, await passwordHash(password), now).run();
    await env.DB.prepare('INSERT INTO signup_attempts(ip,attempted_at) VALUES(?,?)').bind(ip, now).run();
  } else {
    const encoded = admin ? env[ADMIN_EMAILS.get(email)] : (await env.DB.prepare('SELECT password_hash FROM users WHERE email=?').bind(email).first())?.password_hash;
    if (!encoded || !(await passwordValid(password, encoded))) {
      await env.DB.prepare('INSERT INTO login_attempts(ip,attempted_at) VALUES(?,?)').bind(ip, now).run();
      return response(401, { error: 'E-mail ou senha inválidos.' });
    }
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip=?').bind(ip).run();
  const token = encode64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  await env.DB.prepare('INSERT INTO sessions(token_hash,email,is_admin,expires_at) VALUES(?,?,?,?)').bind(await digest(token), email, admin ? 1 : 0, now + 43200).run();
  return response(200, { email, admin }, cookie(token, 43200));
}

function parsePhone(message) {
  const match = message.replace(',', '.').match(/(\d{2,3}(?:[.,]\d+)?)\s*[×xX*]\s*(\d{2,3}(?:[.,]\d+)?)\s*[×xX*]\s*(\d{1,2}(?:[.,]\d+)?)\s*(mm|cm)?/i);
  if (!match) return null;
  let [L, W, T] = match.slice(1, 4).map(v => Number(v.replace(',', '.')));
  if (match[4]?.toLowerCase() === 'cm') { L *= 10; W *= 10; T *= 10; }
  if (!(L >= 50 && L <= 240 && W >= 35 && W <= 190 && T >= 3 && T <= 25)) return null;
  const name = message.slice(0, match.index).match(/(?:iphone|galaxy|pixel|xiaomi|pocophone|poco|redmi|motorola|moto|realme|oneplus)[\w\s+-]{0,35}/i)?.[0]?.trim() || 'Meu celular';
  return { name, L: Math.round(L * 100) / 100, W: Math.round(W * 100) / 100, T: Math.round(T * 100) / 100 };
}

function localReply(message, phone) {
  if (phone) return `Li altura ${phone.L} mm, largura ${phone.W} mm e espessura ${phone.T} mm para ${phone.name}. As medidas estão na faixa plausível para um celular, mas não confirmo o fabricante sem uma fonte confiável. Abra o gerador, confira os valores e use uma foto reta da traseira para marcar a câmera.`;
  if (/capinha|capa|celular|iphone|galaxy|poco|xiaomi|câmera|camera/i.test(message)) return 'Envie as medidas do corpo na ordem altura × largura × espessura, em mm, por exemplo 162,9 × 76,6 × 8,2 mm. Para a câmera, use também uma foto reta da traseira; a foto sozinha não fornece a escala física.';
  return 'Posso ajudar com as ferramentas de impressão 3D do Expressarte. Conte o que quer criar e quais medidas já tem. Para capinhas, informe altura × largura × espessura em mm.';
}

async function externalText(provider, key, message) {
  const instructions = 'Você é o Robô Expressarte, em português brasileiro. Ajude com impressão 3D e capinhas. Não invente medidas oficiais. Peça altura, largura e espessura em mm e uma foto reta da traseira para a câmera. Não prometa editar código nem gerar STL diretamente.';
  const openai = provider === 'openai';
  const url = openai ? 'https://api.openai.com/v1/chat/completions' : 'https://api.anthropic.com/v1/messages';
  const headers = openai ? { authorization: `Bearer ${key}` } : { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  const body = openai ? { model: 'gpt-4o-mini', max_tokens: 500, messages: [{ role: 'system', content: instructions }, { role: 'user', content: message }] } : { model: 'claude-sonnet-4-5', max_tokens: 500, system: instructions, messages: [{ role: 'user', content: message }] };
  const result = await fetch(url, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!result.ok) throw Error('A IA externa não respondeu. Confira sua chave ou use o modo gratuito.');
  const data = await result.json();
  return openai ? data.choices?.[0]?.message?.content : data.content?.[0]?.text;
}

async function chat(request, env, user) {
  if (!user) return response(401, { error: 'Entre ou crie uma conta para conversar com o robô.' });
  const data = await jsonRequest(request);
  const message = data.message;
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) return response(400, { error: 'Escreva uma mensagem de até 2.000 caracteres.' });
  if (data.key !== undefined && (typeof data.key !== 'string' || data.key.length > 300)) return response(400, { error: 'Chave inválida.' });
  const phone = parsePhone(message);
  const provider = data.provider;
  let reply = localReply(message, phone), mode = 'local';
  const day = Math.floor(Date.now() / 1000 / DAY);
  const usage = await env.DB.prepare('SELECT requests FROM chat_usage WHERE email=? AND day=?').bind(user.email, day).first();
  if ((usage?.requests || 0) >= 30) return response(429, { error: 'Limite diário de 30 mensagens atingido. Volte amanhã.' });
  await env.DB.prepare('INSERT INTO chat_usage(email,day,requests) VALUES(?,?,1) ON CONFLICT(email,day) DO UPDATE SET requests=requests+1').bind(user.email, day).run();
  const key = data.key || (user.admin && ['openai', 'anthropic'].includes(provider) ? env[provider.toUpperCase() + '_API_KEY'] : '');
  if (key) {
    if (!['openai', 'anthropic'].includes(provider)) return response(400, { error: 'Provedor inválido.' });
    try { reply = await externalText(provider, key, message); mode = provider; }
    catch (_) { return response(502, { error: 'A IA externa não respondeu. Confira a chave ou use o modo gratuito.' }); }
  } else if (env.AI) {
    try {
      const ai = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', { messages: [
        { role: 'system', content: 'Você é o Robô Expressarte. Responda em português e com brevidade sobre impressão 3D. Não invente medidas de fabricantes. Para capinhas peça altura, largura e espessura em mm; para a câmera peça foto reta da traseira. Não diga que editou o site.' },
        { role: 'user', content: message },
      ] });
      if (ai.response) { reply = ai.response; mode = 'workers-ai'; }
    } catch (_) { /* Limite gratuito atingido: orientação local continua disponível. */ }
  }
  return response(200, { reply, phone, mode });
}

async function vision(request, env, user) {
  const data = await jsonRequest(request);
  const { provider, image } = data;
  const supplied = data.key || '';
  if (typeof supplied !== 'string' || supplied.length > 300 || !['openai', 'anthropic'].includes(provider)) return response(400, { error: 'Chave ou provedor inválido.' });
  const key = supplied || (user?.admin ? env[provider.toUpperCase() + '_API_KEY'] : '');
  if (!key) return response(401, { error: 'Informe sua chave ou entre como administrador.' });
  if (typeof image !== 'string' || image.length > MAX_JSON || !/^data:image\/(png|jpeg|webp);base64,/.test(image)) return response(400, { error: 'Envie uma foto PNG, JPEG ou WebP.' });
  const prompt = 'Analise a foto da TRASEIRA do celular. Responda APENAS JSON {"camera":{"left":n,"top":n,"width":n,"height":n}} em porcentagem do retângulo do corpo do aparelho. Inclua toda a ilha da câmera e flash. Se incerto, use null. Não invente medidas físicas.';
  const openai = provider === 'openai';
  const url = openai ? 'https://api.openai.com/v1/chat/completions' : 'https://api.anthropic.com/v1/messages';
  const headers = openai ? { authorization: `Bearer ${key}` } : { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  const [mime, raw] = image.split(';base64,');
  const body = openai ? { model: 'gpt-4o-mini', response_format: { type: 'json_object' }, max_tokens: 300, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image } }] }] } : { model: 'claude-sonnet-4-5', max_tokens: 300, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image', source: { type: 'base64', media_type: mime.slice(5), data: raw } }] }] };
  try {
    const remote = await fetch(url, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!remote.ok) throw Error('remote');
    const result = await remote.json();
    const text = openai ? result.choices?.[0]?.message?.content : result.content?.[0]?.text;
    const camera = JSON.parse(text).camera;
    if (!camera || ['left', 'top', 'width', 'height'].some(k => typeof camera[k] !== 'number') || camera.left < 0 || camera.top < 0 || camera.width <= 0 || camera.height <= 0 || camera.left + camera.width > 100 || camera.top + camera.height > 100) throw Error('camera');
    return response(200, { camera });
  } catch (_) { return response(502, { error: 'A foto não pôde ser analisada. Confira a chave ou marque a câmera manualmente.' }); }
}

async function api(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/session') {
    const user = await session(request, env);
    return response(200, { authenticated: Boolean(user), email: user?.email || null, admin: Boolean(user?.admin) });
  }
  if (request.method !== 'POST') return response(404, { error: 'Rota não encontrada.' });
  if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) return response(403, { error: 'Origem não permitida.' });
  if (url.pathname === '/api/login') return auth(request, env, false);
  if (url.pathname === '/api/signup') return auth(request, env, true);
  const user = await session(request, env);
  if (url.pathname === '/api/logout') {
    const token = tokenFrom(request);
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
    return response(200, { ok: true }, cookie('', 0));
  }
  if (url.pathname === '/api/chat') return chat(request, env, user);
  if (url.pathname === '/api/vision') return vision(request, env, user);
  return response(404, { error: 'Rota não encontrada.' });
}

async function assets(request, env) {
  let result = await env.ASSETS.fetch(request);
  if (result.status === 404) {
    const url = new URL(request.url);
    if (!url.pathname.endsWith('/') && !url.pathname.split('/').pop().includes('.')) {
      url.pathname += '/index.html';
      result = await env.ASSETS.fetch(new Request(url, request));
    }
  }
  const headers = new Headers(result.headers);
  headers.set('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'");
  return new Response(result.body, { status: result.status, headers });
}

export default {
  async fetch(request, env) {
    try {
      if (new URL(request.url).pathname.startsWith('/api/')) return await api(request, env);
      return await assets(request, env);
    } catch (error) {
      if (error instanceof SyntaxError || error.message === 'Dados inválidos.' || error.message === 'Envie JSON.' || error.message === 'Solicitação muito grande.') return response(400, { error: 'Dados inválidos.' });
      console.error('Expressarte Worker request failed', error);
      return response(500, { error: 'Erro interno. Tente novamente.' });
    }
  },
};
