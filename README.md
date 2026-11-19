# Expressarte Grid

- [Abrir a prévia privada](https://expressarte.cherryfloat4.chatgpt.site/organizador.html)
- [Acompanhar os commits no GitHub](https://github.com/RELRYS03/expressarte-grid/commits/main/)

Os commits mostram as alterações enviadas ao GitHub. A prévia abre a última versão publicada do site.

Projeto independente em `/workspace/gigaprint`. Os arquivos públicos distribuídos em gigaprint.app são a referência para a interface, navegação e processamento 3D no navegador. A cópia local inclui o catálogo, páginas de ferramentas, documentação e versões em espanhol publicadas pela referência.

## Como executar

Requer Python 3 e um navegador moderno com WebGL e WebAssembly. Os recursos ficam em `public/`.

```sh
cd /workspace/gigaprint
python3 serve.py
```

Abra http://127.0.0.1:8000/?lang=es#drawer-organizing para acessar o primeiro gerador. Para usar outra porta, execute `python3 serve.py --port 8080`.

## Primeiro gerador — Organizador de gavetas

Na pasta **Organización de cajones**, abra o primeiro cartão. A rota direta é `/?lang=es#drawer`. Defina as medidas internas da gaveta, escolha um layout e gere as peças. Os downloads ZIP contêm os STLs individuais ou arquivos 3MF por mesa. O projeto pode ser salvo como JSON e reaberto no editor. A geração e a exportação são locais e independem de login, créditos ou quotas de uso. O editor verifica a geometria e o tamanho máximo das peças para a impressora selecionada.

O REA 6.8.0 analisou os módulos públicos de organização e navegação de pastas. Evidência `ev_00489badd6cb28cf1d5d4a606fd4e4c6e08339a587181d78d7859953215232b2`. O catálogo mantém as outras ferramentas para validação após a escolha do usuário.

## Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `serve.py` | Servidor estático com as rotas públicas e política de acesso local aos recursos da aplicação |
| `public/index.html` | Página inicial, catálogo e editores embutidos |
| `public/*/index.html`, `public/es/` | Páginas de ferramentas, documentação e versões em espanhol |
| `public/js/` | Visualização WebGL, geradores, importação de arquivos 3D e exportação |
| `public/local-feedback.js` | Formulário de sugestões com validação e armazenamento no navegador |
| `public/img/`, `public/video/` | Imagens e vídeos das ferramentas |
| `public/THIRD_PARTY_NOTICES.txt` | Avisos das dependências da referência |

Os geradores processam os arquivos no navegador. Os formatos disponíveis variam por ferramenta e incluem STL, OBJ e 3MF como entrada, além de STL, 3MF, ZIP, SVG, DXF e PDF como saída. Sugestões ficam no armazenamento local do navegador. O catálogo usa a seleção inicial de ferramentas populares em vez de consultar estatísticas remotas.

A edição local inclui as calculadoras de escala, peso e comprimento do filamento. As rotas de preço e custo, o login, a cobrança e as ferramentas identificadas como exclusivas para apoiadores foram excluídos do fluxo. Estimativas de tempo e de material usam dimensões, densidade, preenchimento e velocidade.

## Referências da implementação

O commit `1a78f79ebb62a9726730b3030b3ee6a2eb0eb350` da Oficina de enfeites 3D foi consultado para definir verificações da ferramenta de enfeites, incluindo parâmetros, câmeras, layout móvel e exportação. A oficina usa Canvas 2D e malha discretizada. Este projeto usa o editor WebGL e os geradores públicos do GigaPrint. [Commit consultado](https://github.com/RELRYS03/-workspace-gigaprint-estudo/commit/1a78f79ebb62a9726730b3030b3ee6a2eb0eb350)

A análise estática do aplicativo e do módulo de formatos foi executada pelo REA 6.8.0. O registro MCP foi conferido em um perfil descartável do Codex. A evidência de análise local é `ev_16c587462924a77af6707ba46efb12663f1ea99ff27a2783d2d6eb2b4643b40d`.

A compatibilidade com fatiadores específicos e o encaixe físico das peças dependem de testes com as impressoras e materiais de destino.
