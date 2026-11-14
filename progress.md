# Progresso — Equipe Curva do Pato

**Responsável / Lead:** Luiz Antonio Gois Junior  
**Desafio:** #2 — Be An Earth System Trend Detective!

## Sprint fechada

- **ID e hora real:** `sprint-001` a `sprint-005`, `sprint-007` e `sprint-008` concluídas em Sábado, 14/11/2026 às 15h30 (horário local).
- **Frase-objetivo:** Qualquer usuário consegue escolher uma região e variável do sistema terrestre, visualizar 42 anos de dados mensais da NASA (`1984–2025`, `n = 504`), verificar se a tendência é estatisticamente significativa (`α = 0.05`) com Seasonal Mann-Kendall e inclinação Theil-Sen dessazonalizada (`IC 95%`), e inspecionar 4 vetores físicos de atribuição.
- **Frase do dado:** Usamos **NASA POWER (MERRA-2 / CERES), NASA FIRMS (`VIIRS_NOAA21_NRT`), NASA DONKI e Earthdata CMR MCP**. Com eles, provamos estatisticamente o aquecimento e a mudança hidroclimática de 42 anos (`1984–2025`) e separamos se o aumento de irradiação solar vem de redução de nuvens (`All-Sky` vs `Clear-Sky`) ou de aerossóis/queimadas.

## Aceite

- [x] `sprint-001` — PRD com título oficial (`Be An Earth System Trend Detective!`), usuário e ação (`PRD.md`)
- [x] `sprint-002` — Papéis e quadro definidos para Luiz Antonio Gois Junior (`Equipe Curva do Pato`) em `SPEC.json`
- [x] `sprint-003` — Dados da NASA abertos, testados e salvos com fallback verificável (`504` meses `1984–2025`)
- [x] `sprint-004` — Esqueleto completo Backend FastAPI + Frontend React/Vite
- [x] `sprint-005` — Todos os itens essenciais e desejáveis na tela + testes automatizados passando (`pytest`)
- [x] `sprint-007` — Apresentação de 7 slides em inglês (`docs/pitch_deck.html`) 100% conforme o guia (com `Team: Curva do Pato` e título oficial completo)
- [x] `sprint-008` — Textos do relatório oficial prontos (`SUBMISSION.md`, `REFERENCES.md`, `AI_DISCLOSURE.md`)
- [ ] Critério cortado (registrado no `PRD.md` fora do escopo ao vivo): processamento em tempo real de granulometria multi-GB do `NISAR_L2_GUNW_PROVISIONAL_V1` (mantido de forma transparente como `roadmap` com descoberta validada via CMR MCP)

## Próxima

- **`sprint-006` (Publicar URLs finais no Vercel / Hugging Face Spaces e testar em aba anônima)** e **`sprint-009` (Clicar em Submit for Judging até domingo 15/11 às 23h00 — limite máximo 23h59)** — Responsável: **Luiz Antonio Gois Junior**.
