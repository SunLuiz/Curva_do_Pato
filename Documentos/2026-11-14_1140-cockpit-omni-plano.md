# Cockpit-OMNI — Plano de Execução (NASA Space Apps 2026, Campinas)

> **Para quem executar:** este plano assume 30 h de janela (sáb 14/11 11:40 → dom 15/11 23:00).
> Tudo que está marcado **[VERIFICADO]** foi executado nesta máquina hoje, com saída real.
> Tudo que está marcado **[NÃO TESTADO]** é risco declarado, não promessa.

**Objetivo (uma frase):** entregar no ar, em inglês, uma ferramenta que baixa uma série longa de uma variável da Terra numa região escolhida, roda Mann-Kendall + Sen's slope, e **atribui a causa** da tendência a um de quatro vetores (hidrometeoro, fogo/aerossol, geotérmico, heliofísico) — respondendo item por item ao desafio **#2 Be An Earth System Trend Detective!**

**Desafio-alvo:** #2 (Terra, Avançado). Os desafios #9/#10/#11 entram só como narrativa ("Earth as a Mars/Moon analog"), nunca como segunda entrega.

---

## 0. Estado real verificado (o que existe hoje, de verdade)

| Ativo | Estado | Evidência desta sessão |
|---|---|---|
| `cockpit-omni/backend/app/clients/*` | 6 clients Python prontos, `.venv` funcionando | `pymannkendall, scipy, statsmodels, fastapi` importam OK |
| `cockpit-omni/data/` | 3 amostras reais | `power_ne_hourly.csv`, `firms_br_24h.csv`, `horizons_mars_sun.json` |
| `cockpit-omni/frontend/` | **vazio** (`src/`, `public/` sem arquivos) | `find` não lista nenhum arquivo |
| `cockpit-omni/docs/`, `models/`, `scripts/` | **vazios** (só criei `_probe_trend.py`) | idem |
| README, .gitignore, git | **não existem** — e o `.env` tem 11 chaves reais | `ls -la` na raiz do `Hackaton_NASA` |
| `gods-eye-view` | clonado, `node_modules` **ausente**, `build/` presente | Vue 3 + Cesium + Vite, Node v26.7.0 disponível |
| Landing page / demo / slides | **não existem** | — |

**Máquina:** Node v26.7.0 / npm 11.19.0; `.venv` Python OK; hoje é **sábado 14/11, 11:40 BRT**.

### 0.1 Correções factuais aos dois relatórios anteriores (importante antes de codar)

| Afirmação anterior | Realidade medida | Impacto |
|---|---|---|
| "ONS falha por DNS da rede Unicamp" | `dadosabertos.ons.org.br` é **NXDOMAIN no mundo inteiro** (Google DNS `Status:3`, Cloudflare `Status:3`). O host vivo é **`dados.ons.org.br`** → HTTP 200, `package_show?id=geracao-usina-2` OK | corrigir `.env` + `ons_client.py`: `BASE="https://dados.ons.org.br"`. Não é problema de rede — é host morto |
| "ISS LIS para raio seco em tempo real" | ISS LIS **terminou em 2023-11-16** (`isslis_v2_fin`, `v3_fin` no CMR) | trocar por **GOES-R GLM** (`glmgoesL3`, ativo desde 2023) ou remover o vetor "raio" do MVP |
| "FIRMS VIIRS_SNPP" | `VIIRS_SNPP_NRT` devolveu **0 linhas** no Brasil; `VIIRS_NOAA20_NRT` → 1.603; **`VIIRS_NOAA21_NRT` → 3.313** | default `viirs_noaa21` do client está correto — manter e não usar SNPP |
| "Prithvi Weather: `nasa-impact/Prithvi-WxC-1.0-2300M`" | HF devolve **401** nesse id; o correto é `ibm-nasa-geospatial/Prithvi-WxC-1.0-2300M` (200) | não citar id errado no README (juiz checa links) |
| "AERONET é fonte pronta pra AOD" | `print_web_data_v3` para Cuiabá/Brasília devolveu HTML vazio (4 linhas, sem dados) nos períodos testados | AOD do MVP vem de **grânulos MODIS/VIIRS Deep Blue via CMR**, não do CGI do AERONET |
| "Servidor MCP oficial da NASA" | **Verdadeiro e testado**: `POST https://cmr.earthdata.nasa.gov/mcp/v1` → `initialize` OK (protocol 2025-06-18), `tools/list` = `get_keywords, get_collections, get_granules, get_services, get_tools, get_variables, get_citations`; `tools/call get_collections{keyword:"ACTIVE FIRE"}` → `total_hits: 74`, concept `C3264430167-LANCEMODIS` | usar isso no vídeo: é a prova de "usamos o ecossistema NASA" |
| "NISAR como camada do produto" | produtos existem no CMR (`NISAR_L2_GUNW_PROVISIONAL_V1`, desde 2025-10-28) mas exigem Earthdata login + arquivos enormes | **declarar como roadmap**, nunca implementar em 30 h |
| `earthdata-mcp` GET | GET devolve **406**; exige `POST` + header `Mcp-Session-Id` | não perder tempo depurando "406" |

### 0.2 A prova que já temos do motor central **[VERIFICADO]**

`cockpit-omni/scripts/_probe_trend.py` rodou contra NASA POWER **mensal 1984–2025 (504 meses)**, com `pymannkendall.original_test` + `scipy.stats.theilslopes`:

| Região | T2M | PRECTOTCORR | WS2M | ALLSKY_SFC_SW_DWN |
|---|---|---|---|---|
| Campinas-SP (−22.9, −47.06) | **+0.404 °C/década**, τ=0.136, p=5.3e−06 | −0.27 mm/dia/década, τ=−0.089, p=0.0027 | sem tendência (p=0.97) | sem tendência (p=0.20) |
| Petrolina-PE (−9.39, −40.5) | **+0.316 °C/década**, τ=0.138, p=3.7e−06 | −0.04, p=0.022 | sem tendência | +0.26 W/m²/década, p=0.013 |
| Manaus-AM (−3.1, −60.02) | **+0.269 °C/década**, τ=0.249, p≈0 | −0.49, τ=−0.122, p=4.5e−05 | sem tendência | +0.24, p=2.4e−05 |

**Isso é o item 4 do desafio entregue e auditável** (taxa de mudança + teste de significância), com dado NASA, em 9 segundos de execução. O resto do produto é embalagem disso.

---

## 1. Escopo: o que entra, o que sai (regra de corte, decidida agora)

**ENTRA (essencial — até dom 14h):**
1. **Trend Engine**: série longa + Mann-Kendall + Sen's slope + IC, por variável e região, com `n`, `p`, `τ`, slope/década. 3 variáveis: `T2M`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`.
2. **Attribution panel**: 4 vetores, cada um com **status honesto** (`live` / `cached` / `roadmap`) e fonte citada:
   - 🌩️ Hidrometeoro — NASA POWER (+ `CLRSKY_SFC_SW_DWN` para separar nuvem de aerossol) → **live**
   - 🔥 Fogo/aerossol — FIRMS VIIRS NOAA-21 (3.313 focos/24h BR hoje) + FRP → **live**
   - ☀️ Heliofísico — DONKI notifications (14 eventos em 10–14/11) → **live**
   - 🌋 Geotérmico/deformação — NISAR/ECOSTRESS → **roadmap**, com link para o CMR
3. **Landing page** em inglês, dark, com "Access the Cockpit", citações de fonte, **sem logo NASA**.
4. **Globo `gods-eye-view`** com a camada FIRMS ligada, servindo de vitrine visual — **se** o `npm install` + `build` passar antes de sábado 20h; senão vira link externo.
5. **Demo**: 7 slides em inglês (mais seguro e barato que vídeo com legenda) + 1 GIF de 20 s do globo.
6. **Repo público** com README em inglês, `.gitignore`, `REFERENCES`, declaração de uso de IA.

**SAI do MVP (explicitamente):** NISAR real, ECOSTRESS real, SMAP, GPM/IMERG baixado (só citado), GRACE-FO, AERONET, ISS LIS, modelo Surya-1.0 e Lunar Foundation Model, óptica de câmera 1 Hz / fluxo óptico ("Olho de Deus"), qualquer coisa "60 FPS", qualquer subagente/orquestração. Motivo: nenhum deles muda a nota do desafio #2 e todos custam horas de credencial/volume de dados.

---

## 2. Arquitetura alvo (mínima e deplorável em 1 comando)

```
Hackaton_NASA/
├─ cockpit-omni/
│  ├─ backend/
│  │  ├─ app/main.py          # FastAPI: /healthz /api/trend /api/fires /api/spaceweather /api/attribution
│  │  ├─ app/trend.py         # motor MK+Sen (código abaixo, já validado)
│  │  ├─ app/clients/*        # já existe (corrigir ONS)
│  │  └─ tests/test_api.py
│  ├─ frontend/               # Vite + React (ou estático) — landing + cockpit
│  ├─ data/cache/             # respostas NASA congeladas em JSON p/ a demo rodar offline
│  └─ README.md
├─ gods-eye-view/             # vitrine (link/iframe) — opcional
└─ SUBMISSION.md              # texto do envio em inglês + REFERENCES + AI disclosure
```

**Deploy:** frontend → **Vercel**; backend → **Hugging Face Space (Docker, CPU Basic 16 GB)** — melhor que Render/Railway grátis (512 MB) e já foi a recomendação correta do relatório anterior.
**Contingência dura:** se o backend não subir até dom 16h, o frontend lê `data/cache/*.json` e a demo continua funcionando sem servidor. **A demo nunca depende de rede.**

---

## 3. Cronograma (relógio de parede — o recurso mais escasso)

| Janela | Entrega | Critério de pronto |
|---|---|---|
| **Sáb 11:40–12:20** | Tarefa 0: `.gitignore` ANTES de qualquer `git init`; `git init`; README em inglês; `REFERENCES.md`; `AI_DISCLOSURE.md` | `git status` não mostra `.env` |
| **Sáb 12:20–14:00** | Tarefa 1–2: `trend.py` + `/api/trend` + 3 regiões + `pytest` verde | `curl localhost:8000/api/trend?...` devolve τ/p/slope |
| **Sáb 14:00–15:30** | Tarefa 3: cache congelado das respostas (POWER, FIRMS, DONKI) em `data/cache/` | frontend funciona com backend desligado |
| **Sáb 15:30–18:00** | Tarefa 4: landing + cockpit (3 telas: Trend, Attribution, Sources) | roda em `npm run dev` sem erro no console |
| **Sáb 18:00–20:00** | Tarefa 5: deploy Vercel + HF Space; teste em aba anônima | URL pública abre sem login |
| **Sáb 20:00–22:30** | Tarefa 6 (opcional): `gods-eye-view` `npm install` + `build` + FIRMS_MAP_KEY | camada FIRMS desenha focos no globo |
| **Sáb 23:00** | **Primeira submissão no site da NASA** (meta da organização) | botão "Submit for Judging" clicado |
| **Dom 09:00–13:00** | Tarefa 7: vetores de atribuição com dado vivo + gráficos (série + slope) | Attribution mostra 3 `live` + 1 `roadmap` |
| **Dom 13:00–14:00** | Tarefa 8: texto do README/landing em inglês revisado por alguém que fala inglês | — |
| **Dom 14:00–17:00** | Congelamento: versão final publicada, testada em anônimo | URL final anotada |
| **Dom 17:00–20:00** | Tarefa 9: 7 slides + GIF | ≤7 slides, **tudo em inglês** |
| **Dom 20:00–23:00** | Envio final + `REFERENCES` conferido | enviado antes de 23h |
| **Dom 23:59 / seg 00:00** | **Não tocar em mais nada.** Alteração após 00h = desclassificação | — |

---

## 4. Tarefas com arquivos, código e verificação

### Task 0 — Higiene de repositório (10 min, **fazer primeiro**)

**Arquivos:**
- Criar: `Hackaton_NASA/.gitignore`
- Criar: `Hackaton_NASA/README.md` (inglês)
- Criar: `Hackaton_NASA/REFERENCES.md`, `Hackaton_NASA/AI_DISCLOSURE.md`

`.gitignore` mínimo (o `.env` tem chaves de Groq, Z.AI, OpenRouter, CDS, NSRDB, FIRMS, NASA):

```gitignore
.env
.env.*
!.env.example
.venv/
__pycache__/
*.pyc
node_modules/
dist/
build/
.hermes/
data/cache/*.parquet
```

**Verificação:**
```bash
cd "C:/Users/Usuario/OneDrive/Área de Trabalho/Hackaton_NASA"
git init && git add -A && git status --short | grep -c "\.env$"
# esperado: 0
```
Se aparecer 1, **pare** e corrija antes de qualquer `git push` — chave em repo público = desclassificação (`Passo a Passo`, etapa 7: "Senhas e chaves de API fora do código público").

---

### Task 1 — Motor de tendência (30 min) — **código já validado nesta máquina**

**Arquivo:** criar `cockpit-omni/backend/app/trend.py`

```python
"""Cockpit-OMNI — trend engine: Mann-Kendall + Sen's slope over NASA POWER series."""
from __future__ import annotations
import numpy as np, pandas as pd, pymannkendall as mk
from scipy.stats import theilslopes

POWER = "https://power.larc.nasa.gov/api/temporal/monthly/point"
FILL = -999.0

def fetch_monthly(lat: float, lon: float, start: int, end: int,
                  params: str = "T2M,PRECTOTCORR,WS2M,ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN,RH2M",
                  community: str = "AG", timeout: float = 90.0) -> pd.DataFrame:
    """Monthly point series, 1984..now. Drops POWER's month-13 annual summary rows."""
    import httpx
    r = httpx.get(POWER, timeout=timeout, params={
        "parameters": params, "community": community,
        "longitude": round(lon, 2), "latitude": round(lat, 2),
        "start": start, "end": end, "format": "JSON",
    })
    r.raise_for_status()
    df = pd.DataFrame(r.json()["properties"]["parameter"]).replace(FILL, np.nan).astype(float)
    df = df[~df.index.str.endswith("13")]          # <- 202513 = ano inteiro, não dezembro
    df.index = pd.PeriodIndex(df.index, freq="M")
    return df

def trend(series: pd.Series) -> dict:
    """Mann-Kendall (tau, p, trend) + Theil-Sen slope expressed per decade."""
    s = series.dropna()
    if len(s) < 120:
        return {"n": int(len(s)), "status": "insufficient"}
    t = mk.original_test(s)
    slope_per_step, _, _, _ = theilslopes(s.values, np.arange(len(s)))
    return {
        "n": int(len(s)),
        "tau": round(float(t.Tau), 3),          # NOTE: attribute is Tau, not tau
        "p_value": float(f"{t.p:.3e}"),
        "trend": t.trend,                        # increasing | decreasing | no trend
        "slope_per_decade": round(float(slope_per_step) * 120, 4),
        "significant_5pct": bool(t.p < 0.05),
        "start": str(s.index[0]), "end": str(s.index[-1]),
    }
```

**Pitfalls já pagos (não repita):** `pymannkendall` devolve `Tau` (maiúsculo); POWER devolve CSV-index `YYYYMM` com `202513` = anual; `-999.0` é o fill; `CLRSKY_SFC_SW_DWN` vem no `community=AG`, não no `RE`.

**Verificação (já passou hoje):**
```bash
cd "C:/Users/Usuario/OneDrive/Área de Trabalho/Hackaton_NASA/cockpit-omni"
.venv/Scripts/python.exe scripts/_probe_trend.py
# esperado: Campinas T2M tau 0.136 p 5.27e-06 per_decade 0.4038
```

---

### Task 2 — API (40 min)

**Arquivo:** criar `cockpit-omni/backend/app/main.py`

| Rota | Contrato |
|---|---|
| `GET /healthz` | `{"status":"ok","version":"0.1"}` |
| `GET /api/trend?lat&lon&variable&start=1984&end=2025` | `{region, variable, unit, series:[{t,v}], stats:{n,tau,p_value,trend,slope_per_decade,significant_5pct}}` |
| `GET /api/fires?bbox=-74,-34,-34,6&days=1` | GeoJSON FeatureCollection + `count`, `source:"VIIRS NOAA-21 NRT (FIRMS)"` |
| `GET /api/spaceweather?days=7` | `{count, events:[{type,id,time,url}], source:"NASA DONKI"}` |
| `GET /api/attribution?lat&lon` | 4 vetores: `{id, label, status:"live"|"cached"|"roadmap", metric, value, source, url}` |

`/api/attribution` é a peça que vende o projeto: cada vetor devolve `status` + `source` + link do dataset no CMR. **Status honesto pontua em "Validade"; status inflado quebra na pergunta do mentor.**

**Verificação:**
```bash
.venv/Scripts/python.exe -m pytest backend/tests -q          # 3+ passed
curl -s "http://127.0.0.1:8000/api/trend?lat=-22.9&lon=-47.06&variable=T2M" | head -c 300
```

---

### Task 3 — Cache congelado (60 min, **seguro de demo**)

Script `cockpit-omni/scripts/freeze_cache.py`: chama cada rota uma vez, grava `data/cache/{region}_{var}.json`, `fires_br_1d.geojson`, `donki_7d.json`.
Frontend tenta `/api/*` e cai no `cache/*.json` em caso de falha.

**Verificação:** `curl -s localhost:8000/healthz` **desligado** e a página ainda mostrar números. Isso elimina 90% do risco "jurado clica e dá erro".

---

### Task 4 — Landing + Cockpit (2h30)

**Arquivos:** `cockpit-omni/frontend/` (Vite). Três telas — não mais que isso:

1. **Landing** (`/`): título, subtítulo de uma linha, GIF do globo, botão **Access the Cockpit**, seção "NASA data used" com 4 links, footer com citação literal de FIRMS/POWER/DONKI/CMR, **sem logo NASA**, badge "Built at NASA Space Apps Challenge 2026 — Campinas".
2. **Trend** (`/trend`): seletor de região (Campinas/Petrolina/Manaus) + variável; gráfico da série com linha de Sen; card com `τ`, `p`, slope/década e veredito "statistically significant (α=0.05)".
3. **Attribution** (`/attribution`): os 4 vetores com cor, status e fonte clicável.

Paleta reaproveitável do Cockpit-SIN (dark `#0A0E17`; SE/CO azul, NE âmbar, S verde, N ciano). **Não inventar design novo** — o "Apresentação" vale tanto quanto os outros 4 critérios, e consistência > novidade.

**Verificação:** `npm run build` sem erro; DevTools console limpo; Lighthouse não importa aqui.

---

### Task 5 — Deploy (2h)

1. `vercel --prod` no `frontend/`, env `VITE_API_BASE` → URL do HF Space.
2. HF Space **Docker, CPU Basic 16 GB**: `Dockerfile` com `uvicorn app.main:app --host 0.0.0.0 --port 7860`; secrets = só as 3 chaves necessárias (`FIRMS_MAP_KEY`, `NASA_API_KEY`, `HF_TOKEN` opcional).
3. **Teste em aba anônima, deslogado, em outra rede (4G).**

Se o HF Space atrasar: mantém frontend no ar com o cache e escreve no README "backend demo mode = cached NASA responses (24h snapshot)". **Nunca deixar link quebrado na submissão.**

---

### Task 6 — Globo `gods-eye-view` (opcional, timebox 2h — corta sem culpa)

```bash
cd "C:/Users/Usuario/OneDrive/Área de Trabalho/Hackaton_NASA/gods-eye-view"
npm install                 # node_modules ausente hoje
npm run build
npm run dev                 # http://localhost:4173
```
A camada FIRMS **já existe** no projeto (`src/layers/firms/`, proxy `/api/firms`) e aceita `FIRMS_MAP_KEY` no `.env` — ou seja, é reaproveitamento, não desenvolvimento.

⚠️ **Licença:** `DATA_SOURCES.md` avisa que **TeleGeography é CC BY-NC-SA** (não-MIT, carve-out). Para um projeto não comercial de hackathon com atribuição isso é aceitável — mas **declare no REFERENCES** e mantenha o lightbox de atribuição visível. Nunca remover os créditos.

**Kill switch:** se `npm install` quebrar 2×, ou passar de 20h, o globo vira **link de crédito** no slide ("globe layer by God's Eye View, MIT") e seguimos.

---

### Task 7 — Atribuição com dado vivo (4h, domingo)

Para cada vetor, um número real e a fonte:
- Hidrometeoro: `slope_per_decade` de `PRECTOTCORR` + `RH2M` da mesma região (já temos: Campinas −0.27 mm/dia/década, RH −1.77%/década, p=3.7e−13).
- Fogo: `count` de focos no bbox + `FRP` médio do CSV FIRMS (3.313 focos/24h no Brasil hoje).
- Heliofísico: `count` de notificações DONKI (14 em 10–14/11) e a mais recente com link.
- Geotérmico: `status: roadmap` + concept_id `NISAR_L2_GUNW_PROVISIONAL_V1` do CMR.

**Verificação:** cada card tem `source` clicável que abre página NASA real, não Wikipedia.

---

### Task 8 — Demo: 7 slides (3h, domingo)

Inglês, ≤7 slides contando capa, ≤30 s de leitura por slide:
1. Title + "Cockpit-OMNI" + desafio #2
2. The problem: "a trend without a significance test is an opinion" (citar a pergunta do mentor)
3. NASA data used: POWER, FIRMS, DONKI, CMR MCP (com links)
4. Resultado real: Campinas +0.40 °C/decade, τ=0.136, p=5.3e−06 (screenshot do app, não mockup)
5. Attribution: os 4 vetores, com `live/live/live/roadmap` visível
6. Why it matters: operador de sistema elétrico / defesa civil / agricultor
7. Links + AI disclosure + "built in 36 h at Campinas"

Regra: **só screenshot do que está no ar.** Slide com tela que não existe é o erro que mais custa nota em "Apresentação".

---

## 5. Riscos e planos B

| Risco | Prob. | Plano B |
|---|---|---|
| Backend não sobe no HF Space | média | demo 100% cache estático (Task 3) — já previsto |
| `gods-eye-view` não instala/builda | média | cortar globo, usar GIF gravado do repo oficial? **Não** — usar screenshot próprio de uma versão local; se não houver, cortar o slide |
| POWER lento/instável no domingo | baixa | cache + `start=1984&end=2025` já baixado |
| Jurado abre e vê 0 focos (FIRMS sem foco no bbox) | média | cache de 1 dia + fallback `days=2`; se 0, mostrar contagem nacional e explicar filtro |
| Alguém "melhora" o projeto depois de 00h de segunda | — | congelar o repo: `git tag submission-final` domingo 22h45 |
| Inglês fraco no texto | alta | Task 8 tem revisor humano obrigatório; IA pode rascunhar, declaração no `AI_DISCLOSURE.md` |

---

## 6. Checklist de submissão (imprimir e riscar)

- [ ] Repo público, **sem `.env`**, com README em inglês
- [ ] `.gitignore` verificado **antes** do primeiro commit
- [ ] `REFERENCES.md`: POWER, FIRMS, DONKI, CMR/earthdata-mcp, God's Eye View (MIT), TeleGeography (CC BY-NC-SA carve-out)
- [ ] `AI_DISCLOSURE.md`: ferramentas usadas, o que foi gerado por IA
- [ ] **Nenhum logo NASA** em página, slide ou vídeo
- [ ] Link público testado em **aba anônima** e em **outra rede**
- [ ] Demo ≤7 slides **ou** vídeo ≤30 s, ambos em inglês
- [ ] Os 4 elementos do desafio respondidos item por item no README
- [ ] "Submit for Judging" clicado **antes de 23h domingo**
- [ ] Nada alterado a partir de 00h de segunda

---

## 7. Uma decisão que vale registrar

**Recomendação:** entregar **um** motor estatístico honesto + 3 vetores vivos + 1 vetor declarado como roadmap, em vez dos "4 motores de causalidade" completos do documento anterior. Trade-off em uma frase: perde-se o "wow" de 12 satélites no slide, ganha-se o único critério que o desafio #2 coloca em negrito — *a mudança é estatisticamente significativa?* — e evita-se o pior cenário de hackathon: um sistema que mostra tudo e não prova nada.

O globo entra como **vitrine**, não como arquitetura: ele já existe, já tem FIRMS e é MIT. Nenhuma linha de Cesium deve ser escrita neste fim de semana.
