"""
Goal-oriented layperson presets and auditable traffic-light insight translator.
Translates technical Seasonal Mann-Kendall + Theil-Sen statistics into plain-language
sentences, traffic-light severities (green / amber / red), and actionable guidance
in both English ("en") and Brazilian Portuguese ("pt").
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from app.trend import PRESET_REGIONS

_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_CACHE_DIR = _ROOT / "data" / "cache"

_SEVERITY_RANK = {"green": 0, "amber": 1, "red": 2}

VARIABLE_HUMAN: dict[str, dict[str, dict[str, str]]] = {
    "T2M": {
        "en": {
            "name": "Surface Air Temperature",
            "unit_plain": "C",
            "summary": "Air temperature 2 meters above ground",
        },
        "pt": {
            "name": "Temperatura do ar (superficie)",
            "unit_plain": "C",
            "summary": "Temperatura do ar a 2 metros do solo",
        },
    },
    "PRECTOTCORR": {
        "en": {
            "name": "Rainfall",
            "unit_plain": "mm/day",
            "summary": "Daily average precipitation over the month",
        },
        "pt": {
            "name": "Chuva",
            "unit_plain": "mm/dia",
            "summary": "Media diaria de chuva ao longo do mes",
        },
    },
    "ALLSKY_SFC_SW_DWN": {
        "en": {
            "name": "Sunlight Reaching Ground",
            "unit_plain": "MJ/m2/day",
            "summary": "Total solar energy passing through clouds to the surface",
        },
        "pt": {
            "name": "Energia do sol que chega ao chao",
            "unit_plain": "MJ/m2/dia",
            "summary": "Radiacao solar total considerando nuvens e atmosfera",
        },
    },
    "CLRSKY_SFC_SW_DWN": {
        "en": {
            "name": "Clear-Sky Sunlight (No Clouds)",
            "unit_plain": "MJ/m2/day",
            "summary": "Solar energy under cloudless skies — isolates smoke and haze",
        },
        "pt": {
            "name": "Luz solar sem nuvens (transparencia)",
            "unit_plain": "MJ/m2/dia",
            "summary": "Energia solar com ceu limpo — revela fumaca e aerossois",
        },
    },
    "CLOUD_ATTEN_PCT": {
        "en": {
            "name": "Sun Blocked by Clouds",
            "unit_plain": "%",
            "summary": "Fraction of sunlight intercepted by cloud cover",
        },
        "pt": {
            "name": "Sol bloqueado por nuvens",
            "unit_plain": "%",
            "summary": "Percentual da luz solar barrada pela cobertura de nuvens",
        },
    },
    "RH2M": {
        "en": {
            "name": "Air Humidity",
            "unit_plain": "%",
            "summary": "Moisture near ground level — low humidity amplifies fire & heat stress",
        },
        "pt": {
            "name": "Umidade do ar",
            "unit_plain": "%",
            "summary": "Umidade a 2m — ar seco agrava calor extremo e risco de fogo",
        },
    },
    "WS2M": {
        "en": {
            "name": "Surface Wind Speed (2m)",
            "unit_plain": "m/s",
            "summary": "Monthly ground-level wind — cannot predict hourly turbine gusts",
        },
        "pt": {
            "name": "Vento proximo ao solo (2m)",
            "unit_plain": "m/s",
            "summary": "Media mensal a 2m — nao serve para prever rajadas horarias",
        },
    },
}

PRESETS: list[dict[str, Any]] = [
    {
        "id": "calor",
        "variables": ["T2M", "ALLSKY_SFC_SW_DWN", "RH2M"],
        "primary_variable": "T2M",
        "en": {
            "title": "Prepare for Heatwaves",
            "question": "Is it getting warmer where I live?",
            "explanation": "Shows surface temperature, solar energy reaching the ground, and air humidity — the three drivers of a heatwave.",
            "actions": {
                "red": "Red alert: Multi-decade warming is strongly confirmed here. Prioritize urban tree shade, hydration points, and afternoon heat protocols.",
                "amber": "Amber watch: Moderate warming detected. Track dry-season heat peaks closely.",
                "green": "Green stable: No critical long-term heat escalation found in baseline records.",
            },
        },
        "pt": {
            "title": "Preparar para onda de calor",
            "question": "Esta ficando mais quente na minha regiao?",
            "explanation": "Mostra a temperatura, a energia do sol e a umidade — os 3 fatores de uma onda de calor.",
            "actions": {
                "red": "Nivel vermelho: Aquecimento historico forte confirmado. Priorize pontos de hidratacao, sombra urbana e protecao termica a tarde.",
                "amber": "Nivel atencao: Aquecimento moderado detectado. Acompanhe picos de calor na estacao seca.",
                "green": "Nivel estavel: Nenhuma escalada critica de calor confirmada no historico.",
            },
        },
    },
    {
        "id": "seca",
        "variables": ["PRECTOTCORR", "RH2M", "CLOUD_ATTEN_PCT"],
        "primary_variable": "PRECTOTCORR",
        "en": {
            "title": "Why Is It Drying?",
            "question": "Are rainfall and humidity falling together?",
            "explanation": "Compares rainfall, relative humidity, and cloud cover so you can separate real drought from clear-sky shifts.",
            "actions": {
                "red": "Red alert: Statistically significant drop in rain and/or humidity confirmed. Prioritize water storage resilience and soil conservation.",
                "amber": "Amber watch: Partial drying or thinner cloud cover observed across the 42-year record.",
                "green": "Green stable: Precipitation and humidity remain statistically stationary.",
            },
        },
        "pt": {
            "title": "Por que esta secando?",
            "question": "A chuva e a umidade do ar estao caindo juntas?",
            "explanation": "Cruza chuva, umidade do ar e cobertura de nuvens para explicar a estiagem sem jargao.",
            "actions": {
                "red": "Nivel vermelho: Queda estatisticamente confirmada em chuva e umidade. Reforce gestao de reservatorios e economia de agua.",
                "amber": "Nivel atencao: Secagem parcial ou reducao de nuvens observada na serie de 42 anos.",
                "green": "Nivel estavel: Chuva e umidade seguem sem queda critica comprovada.",
            },
        },
    },
    {
        "id": "fogo",
        "variables": ["CLRSKY_SFC_SW_DWN", "RH2M", "T2M"],
        "primary_variable": "CLRSKY_SFC_SW_DWN",
        "uses_fires": True,
        "en": {
            "title": "Do Wildfires Reach Me?",
            "question": "Are active fires nearby or changing clear-sky haze?",
            "explanation": "Combines 24h NASA satellite fire detections (<150 km radius) with clear-sky sunlight and dry-air conditions.",
            "actions": {
                "red": "Red alert: Active fire hotspots detected within 150 km alongside drying air. Follow civil-defense smoke advisories.",
                "amber": "Amber watch: Zero hotspots inside 150 km in this snapshot, though national fires and long-term clear-sky/dry shifts persist.",
                "green": "Green stable: No nearby active hotspots and stable clear-sky transparency.",
            },
        },
        "pt": {
            "title": "As queimadas me atingem?",
            "question": "Ha focos de fogo perto ou mudanca de fumaca no ceu?",
            "explanation": "Junta focos NASA das ultimas 24h (raio de 150 km) com transparencia do ceu sem nuvens e umidade do ar.",
            "actions": {
                "red": "Nivel vermelho: Focos ativos detectados a menos de 150 km com ar seco. Siga boletins de qualidade do ar.",
                "amber": "Nivel atencao: Nenhum foco a menos de 150 km neste recorte, mas ha focos no pais e mudanca historica de ceu limpo/ar seco.",
                "green": "Nivel estavel: Sem focos proximos e ceu claro estavel.",
            },
        },
    },
    {
        "id": "clima_espacial",
        "variables": ["ALLSKY_SFC_SW_DWN", "WS2M"],
        "primary_variable": "ALLSKY_SFC_SW_DWN",
        "uses_spaceweather": True,
        "en": {
            "title": "Solar Storm Today?",
            "question": "Are solar flares or CMEs active right now?",
            "explanation": "Reads 7-day NASA DONKI space weather notifications alongside surface solar availability and declared wind limits.",
            "actions": {
                "red": "Red alert: High count of solar/geomagnetic notifications in the last 7 days — monitor HF radio, GNSS accuracy, and power grid alerts.",
                "amber": "Amber watch: Routine solar notifications present in NASA DONKI 7-day window; surface weather trends remain bounded by monthly resolution.",
                "green": "Green stable: Quiet solar weather window; remember monthly 2m wind (WS2M) shows no trend and never forecasts hourly wind gusts.",
            },
        },
        "pt": {
            "title": "Tempestade solar hoje?",
            "question": "O Sol esta agitado e isso afeta energia ou redes hoje?",
            "explanation": "Verifica notificacoes solares da NASA (DONKI, 7 dias) junto a energia solar local e limites do vento a 2m.",
            "actions": {
                "red": "Nivel vermelho: Muitos alertas solares/geomagneticos nos ultimos 7 dias — acompanhe GPS, radio HF e redes eletricas.",
                "amber": "Nivel atencao: Notificacoes solares moderadas na janela de 7 dias do DONKI; sistema eletrico sob monitoramento normal.",
                "green": "Nivel estavel: Janela espacial tranquila; vento mensal a 2m nao tem tendencia para prever rajadas horarias.",
            },
        },
    },
    {
        "id": "cidadao",
        "variables": ["T2M", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M"],
        "primary_variable": "T2M",
        "en": {
            "title": "How Is My City's Climate?",
            "question": "Give me the big-picture health check in plain language.",
            "explanation": "Audits temperature, rain, sunlight, humidity, and wind side-by-side and summarizes everything in a single traffic light.",
            "actions": {
                "red": "Red summary: At least one 42-year climate variable shows strong deterioration here — review the red card below first.",
                "amber": "Amber summary: Moderate long-term shifts are verified in radiation or moisture.",
                "green": "Green summary: No severe multi-decade shift flagged across tested indicators.",
            },
        },
        "pt": {
            "title": "Como esta o clima da minha cidade?",
            "question": "Resumo completo em linguagem simples, estilo semaforo.",
            "explanation": "Avalia temperatura, chuva, sol, umidade e vento lado a lado e entrega o diagnostico direto.",
            "actions": {
                "red": "Resumo vermelho: Pelo menos um indicador de 42 anos mostra piora acentuada — comece pelo cartao vermelho abaixo.",
                "amber": "Resumo atencao: Mudancas moderadas de longo prazo confirmadas em radiacao ou umidade.",
                "green": "Resumo estavel: Nenhum desvio severo identificado nos indicadores avaliados.",
            },
        },
    },
]


def _norm_lang(lang: str) -> str:
    return "pt" if str(lang or "").lower().startswith("pt") else "en"


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    cos_arg = max(
        -1.0,
        min(
            1.0,
            math.sin(rlat1) * math.sin(rlat2) + math.cos(rlat1) * math.cos(rlat2) * math.cos(rlon2 - rlon1),
        ),
    )
    return 6371.0 * math.acos(cos_arg)


def list_presets(lang: str = "en") -> list[dict[str, Any]]:
    l = _norm_lang(lang)
    out = []
    for p in PRESETS:
        copy = p[l]
        out.append(
            {
                "id": p["id"],
                "title": copy["title"],
                "question": copy["question"],
                "explanation": copy["explanation"],
                "variables": p["variables"],
                "primary_variable": p["primary_variable"],
            }
        )
    return out


def score_variable_severity(variable: str, stats: dict[str, Any]) -> str:
    sig = bool(stats.get("significant_5pct"))
    slope = float(stats.get("slope_per_decade") or 0.0)
    if not sig:
        return "green"
    if variable == "T2M":
        if slope >= 0.35:
            return "red"
        if slope >= 0.18:
            return "amber"
        return "green"
    if variable == "PRECTOTCORR":
        if slope <= -0.25:
            return "red"
        if slope < 0:
            return "amber"
        return "green"
    if variable == "RH2M":
        if slope <= -1.2:
            return "red"
        if slope < 0:
            return "amber"
        return "green"
    if variable in ("ALLSKY_SFC_SW_DWN", "CLRSKY_SFC_SW_DWN"):
        return "amber" if abs(slope) >= 0.15 else "green"
    if variable == "CLOUD_ATTEN_PCT":
        return "amber" if abs(slope) >= 0.5 else "green"
    return "green"


def _human_phrase(variable: str, region_name: str, stats: dict[str, Any], lang: str) -> str:
    meta = VARIABLE_HUMAN.get(variable, {}).get(lang, {})
    name = meta.get("name", variable)
    unit = meta.get("unit_plain", "")
    sig = bool(stats.get("significant_5pct"))
    slope = float(stats.get("slope_per_decade") or 0.0)
    total = float(stats.get("total_change") or 0.0)
    pval = stats.get("p_value", 1.0)
    sign_slope = "+" if slope > 0 else ""
    sign_total = "+" if total > 0 else ""

    if not sig:
        if lang == "pt":
            return f"Em {region_name}, {name.lower()} nao mostrou tendencia comprovada em 42 anos (p = {pval})."
        return f"In {region_name}, {name.lower()} shows no statistically proven 42-year trend (p = {pval})."

    direction_en = "rose" if slope > 0 else "dropped"
    direction_pt = "subiu" if slope > 0 else "caiu"
    if lang == "pt":
        return (
            f"Em {region_name}, {name.lower()} {direction_pt} {sign_slope}{slope:.2f} {unit}/decada "
            f"({sign_total}{total:.2f} {unit} no total de 1984 a 2025)."
        )
    return (
        f"In {region_name}, {name.lower()} {direction_en} {sign_slope}{slope:.2f} {unit}/decade "
        f"({sign_total}{total:.2f} {unit} total from 1984 to 2025)."
    )


def build_insight(
    preset_id: str,
    region: str = "campinas",
    lang: str = "en",
    cache_dir: Path | None = None,
) -> dict[str, Any]:
    l = _norm_lang(lang)
    preset = next((p for p in PRESETS if p["id"] == preset_id), None)
    if not preset:
        raise KeyError(f"Unknown preset '{preset_id}'")
    reg_id = str(region or "campinas").lower()
    if reg_id not in PRESET_REGIONS:
        raise KeyError(f"Unknown preset region '{region}'")

    cdir = cache_dir or _DEFAULT_CACHE_DIR
    reg_info = PRESET_REGIONS[reg_id]
    indicators: list[dict[str, Any]] = []
    worst_sev = "green"

    for var in preset["variables"]:
        payload = _read_json(cdir / f"trend_{reg_id}_{var}.json")
        if not payload or not payload.get("stats"):
            continue
        st = payload["stats"]
        sev = score_variable_severity(var, st)
        if _SEVERITY_RANK[sev] > _SEVERITY_RANK[worst_sev]:
            worst_sev = sev
        hm = VARIABLE_HUMAN.get(var, {}).get(l, {})
        indicators.append(
            {
                "variable": var,
                "human_name": hm.get("name", payload.get("label", var)),
                "unit_plain": hm.get("unit_plain", payload.get("unit", "")),
                "severity": sev,
                "significant_5pct": bool(st.get("significant_5pct")),
                "slope_per_decade": st.get("slope_per_decade"),
                "total_change": st.get("total_change"),
                "p_value": st.get("p_value"),
                "sentence": _human_phrase(var, reg_info["name"], st, l),
            }
        )

    extras: dict[str, Any] = {}
    if preset.get("uses_fires"):
        fires = _read_json(cdir / "fires_br_1d.geojson") or {}
        features = fires.get("features") or []
        nearby = 0
        for ft in features:
            coords = (ft.get("geometry") or {}).get("coordinates") or []
            if len(coords) >= 2 and _haversine_km(reg_info["lat"], reg_info["lon"], coords[1], coords[0]) <= 150.0:
                nearby += 1
        total_br = int(fires.get("count") or len(features))
        extras["fires"] = {"brazil_24h": total_br, "nearby_150km": nearby, "mean_frp_mw": fires.get("mean_frp_mw")}
        if nearby >= 5:
            worst_sev = "red"
        elif total_br > 0 and worst_sev == "green":
            worst_sev = "amber"

    if preset.get("uses_spaceweather"):
        donki = _read_json(cdir / "donki_7d.json") or {}
        alerts = donki.get("notifications") or donki.get("items") or []
        count = int(donki.get("count") or len(alerts))
        extras["space_weather"] = {"alerts_7d": count}
        if count >= 12:
            worst_sev = "red"
        elif count >= 1 and worst_sev == "green":
            worst_sev = "amber"

    copy = preset[l]
    primary_ind = next((i for i in indicators if i["variable"] == preset["primary_variable"]), indicators[0] if indicators else None)
    if preset.get("uses_fires") and extras.get("fires"):
        finfo = extras["fires"]
        if l == "pt":
            headline = (
                f"{finfo['nearby_150km']} focos ativos a menos de 150 km de {reg_info['name']} "
                f"({finfo['brazil_24h']:,} no Brasil). {primary_ind['sentence'] if primary_ind else ''}"
            ).strip()
        else:
            headline = (
                f"{finfo['nearby_150km']} active fire hotspots within 150 km of {reg_info['name']} "
                f"({finfo['brazil_24h']:,} across Brazil). {primary_ind['sentence'] if primary_ind else ''}"
            ).strip()
    elif preset.get("uses_spaceweather") and extras.get("space_weather"):
        sinfo = extras["space_weather"]
        if l == "pt":
            headline = (
                f"{sinfo['alerts_7d']} alertas solares/geomagneticos da NASA DONKI nos ultimos 7 dias. "
                f"{primary_ind['sentence'] if primary_ind else ''}"
            ).strip()
        else:
            headline = (
                f"{sinfo['alerts_7d']} NASA DONKI solar/geomagnetic alerts recorded over 7 days. "
                f"{primary_ind['sentence'] if primary_ind else ''}"
            ).strip()
    else:
        headline = primary_ind["sentence"] if primary_ind else copy["explanation"]

    return {
        "preset_id": preset["id"],
        "lang": l,
        "region": reg_info,
        "title": copy["title"],
        "question": copy["question"],
        "explanation": copy["explanation"],
        "severity": worst_sev,
        "headline": headline,
        "action": copy["actions"][worst_sev],
        "indicators": indicators,
        "extras": extras,
    }
