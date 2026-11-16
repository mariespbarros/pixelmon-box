# Pixelmon Box ✦

Uma cápsula em pixel art que revela uma criatura diferente a cada abertura.
HTML + CSS + JavaScript puro (módulos ES), sem frameworks e sem dependências.

🔗 **Jogue aqui:** https://mariespbarros.github.io/pixelmon-box/

## Destaques
- Pixel art desenhada por código (canvas 32×32), sem nenhuma imagem pronta
- 1500 criaturas originais geradas proceduralmente, com nome, tipo, ficha e grito próprios
- Pokémon reais via PokéAPI quando a página está online
- Raridades, shiny, fugas e evoluções
- Pokédex com fichas, apelidos, favoritos e 25 conquistas
- Batalhas por turno com vantagens de tipo
- Bolas especiais desbloqueáveis e bônus diário
- Dia e noite pelo horário real, clima (chuva, neve, vento) e cenários por tipo
- Efeitos e música 8-bit gerados com a Web Audio API
- Cartão da criatura em imagem e exportação/importação da coleção
- Responsivo (celular em pé e deitado, tablet e desktop)
- Acessível por teclado (Enter, P, B, Esc) e com suporte a movimento reduzido

## Estrutura

```
pixelmon-box/
├── index.html          estrutura da página
├── css/
│   ├── base.css        cores, fundo, HUD, cena e área de informações
│   ├── creature.css    sprite, aura e raridades
│   ├── pokedex.css     botões do topo e Pokédex
│   ├── hud.css         cartão, seletor de bolas, avisos e telas baixas
│   ├── panels.css      ficha e conquistas
│   ├── battle.css      batalha
│   └── dialogs.css     compartilhar, ajustes e tutorial
└── js/
    ├── main.js         ponto de entrada: inicializa tudo
    ├── utils.js        matemática, cores, sorteio com semente, armazenamento
    ├── dom.js          referências aos elementos da página
    ├── state.js        estado global do jogo
    ├── settings.js     configurações e preferência de movimento
    ├── types.js        tipos (nomes em português e cores)
    ├── ball.js         Pokébola em pixel art, paletas e bolas especiais
    ├── creatures.js    gerador procedural de criaturas, nomes e raridades
    ├── sheet.js        ficha: altura, peso, habilidade, descrição, atributos
    ├── api.js          PokéAPI (com recurso para o gerador quando offline)
    ├── sequence.js     abrir, revelar, fugir, evoluir e fechar
    ├── loop.js         loop de animação (requestAnimationFrame)
    ├── layout.js       layout responsivo em pixels inteiros
    ├── effects.js      partículas e céu estrelado
    ├── world.js        dia/noite, clima, bônus diário e cenários por tipo
    ├── audio.js        efeitos 8-bit e gritos das criaturas
    ├── music.js        música de fundo gerada na hora
    ├── pokedex.js      coleção, grade, filtros e ficha
    ├── achievements.js conquistas
    ├── battle.js       batalha por turnos
    ├── share.js        cartão em imagem
    ├── save.js         exportar e importar a coleção
    ├── ballbar.js      seletor de bolas
    ├── ui.js           avisos, janelas e tutorial
    └── bindings.js     botões e atalhos de teclado
```

## Rodando localmente

Por usar módulos JavaScript, o navegador não abre o `index.html` direto do disco
(com dois cliques). Rode um servidor local simples, com qualquer uma destas opções:

- **VS Code:** instale a extensão *Live Server* e clique em **Go Live**
- **Node:** `npx serve .`
- **Python:** `python -m http.server 8000` e abra http://localhost:8000

No GitHub Pages funciona sem nenhuma configuração extra.

---

> Projeto de fã, sem fins comerciais. Pokémon e Pokébola são marcas da
> Nintendo / Game Freak / The Pokémon Company. Dados de Pokémon via [PokéAPI](https://pokeapi.co).
