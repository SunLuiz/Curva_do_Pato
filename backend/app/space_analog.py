"""
Cockpit-OMNI Space Analog & 4-Layer MPTO Telemetry Adapter.
Connects zero-key open space APIs:
  1. NASA Deep Space Network Now XML (https://eyes.nasa.gov/dsn/data/dsn.xml)
  2. NASA OSDR / GeneLab Biological Study API (https://osdr.nasa.gov/osdr/data/osd/meta/253)
  3. CelesTrak GP JSON Orbital Elements (https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json)
Plus architectural descriptors for JPL Horizons, Mars 2020 MEDA, and the 7 MPTO Frontiers.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import httpx

DSN_URL = "https://eyes.nasa.gov/dsn/data/dsn.xml"
OSDR_STUDY_ID = "OSD-615"
OSDR_STUDY_URL = "https://osdr.nasa.gov/osdr/data/osd/meta/615"
CELESTRAK_STATIONS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json"

MPTO_FRONTIERS: list[dict[str, Any]] = [
    {
        "id": 1,
        "layer": "Thermal",
        "title_en": "Heat Sink Saturation (T^4 Radiator Ceiling)",
        "title_pt": "Saturacao do Radiador Termico (Limite T^4)",
        "detail_en": "Schedule AI/compute curtailment before radiative T^4 heat rejection saturates under low optical depth.",
        "detail_pt": "Acionar curtailment termico da IA antes que o radiador sature sob sol forte (tau baixo).",
    },
    {
        "id": 2,
        "layer": "Thermal / Regolith",
        "title_en": "Regolith Abrasion & Thermal Cycling Fatigue",
        "title_pt": "Abrasao do Regolito e Fadiga de Ciclos Termicos",
        "detail_en": "Track remaining thermal cycle budget per second-life battery pack before switching electrical contacts.",
        "detail_pt": "Orçar ciclos termicos restantes de cada pack de bateria antes de chavear contatos eletricos.",
    },
    {
        "id": 3,
        "layer": "Thermal / Radiative",
        "title_en": "Lunar Crater IR Albedo & Re-Radiation Gain (10-15%)",
        "title_pt": "Ganho de Albedo IR Lunar e Re-irradiacao (10-15%)",
        "detail_en": "Include diffuse crater wall IR heating to reduce nighttime BESS heating draw by 10-15%.",
        "detail_pt": "Incluir calor IR difuso de encostas iluminadas para cortar 10-15% do gasto termico da bateria.",
    },
    {
        "id": 4,
        "layer": "Biological",
        "title_en": "Biological Circularity Reserve (SoC_bio)",
        "title_pt": "Circularidade Biologica como Reserva (SoC_bio)",
        "detail_en": "Protect minimum dry plant biomass (cellulose -> CH4/H2 ISRU gasifier) below the chemical battery floor.",
        "detail_pt": "Manter biomassa seca minima (celulose -> gaseificador ISRU CH4/H2) como piso de sobrevivencia.",
    },
    {
        "id": 5,
        "layer": "Logistics",
        "title_en": "Rovers as Mobile Energy Arbitrage (Spatial Dispatch)",
        "title_pt": "Rede de Rovers como Massa Movente de Energia",
        "detail_en": "Optimize driving to sunlit rims vs. staying tethered via 5 km cable using Wh/km travel cost.",
        "detail_pt": "Arbitrar entre carregar via cabo de 5 km ou dirigir ate crista iluminada descontando custo Wh/km.",
    },
    {
        "id": 6,
        "layer": "Logistics",
        "title_en": "Actuator Lead-Time Dispatch (30-60 min Ahead)",
        "title_pt": "Despacho Antecipado por Latencia de Atuadores",
        "detail_en": "Start Stirling engines, ISRU gasifiers, and rovers hours before a predicted ramp rather than reacting late.",
        "detail_pt": "Partir motores Stirling, gaseificador ISRU e rovers com 30-60+ min de antecedencia antes da rampa.",
    },
    {
        "id": 7,
        "layer": "Parametric Uncertainty",
        "title_en": "Physical Model Uncertainty (Dust Cp & Sintered Regolith k)",
        "title_pt": "Incerteza Parametrica (Cp da Poeira e Condutividade k)",
        "detail_en": "Recompute P10-P95 risk margins live as dust heat capacity Cp and sintered regolith conductivity k vary.",
        "detail_pt": "Recalcular margens P10-P95 conforme variam o Cp da poeira carregada e a condutividade k do regolito.",
    },
]


def _parse_dsn_xml(xml_text: str) -> dict[str, Any]:
    root = ET.fromstring(xml_text)
    stations: list[dict[str, Any]] = []
    dishes: list[dict[str, Any]] = []
    for child in root:
        if child.tag == "station":
            stations.append(
                {
                    "name": child.attrib.get("name"),
                    "friendlyName": child.attrib.get("friendlyName"),
                }
            )
        elif child.tag == "dish":
            targets = [
                sub.attrib.get("name")
                for sub in child
                if sub.tag == "target" and sub.attrib.get("name")
            ]
            down = next((sub for sub in child if sub.tag == "downSignal"), None)
            dishes.append(
                {
                    "name": child.attrib.get("name"),
                    "az_deg": child.attrib.get("azimuthAngle"),
                    "el_deg": child.attrib.get("elevationAngle"),
                    "wind_kmh": child.attrib.get("windSpeed"),
                    "targets": targets,
                    "down_band": down.attrib.get("band") if down is not None else None,
                    "data_rate_bps": down.attrib.get("dataRate") if down is not None else None,
                }
            )
    active_dishes = [d for d in dishes if d["targets"]]
    return {
        "source": "NASA Deep Space Network Now",
        "url": DSN_URL,
        "stations_count": len(stations),
        "stations": [s["friendlyName"] or s["name"] for s in stations],
        "total_dishes": len(dishes),
        "active_dishes_count": len(active_dishes),
        "sample_active": (active_dishes or dishes)[:6],
    }


def _parse_osdr_study(payload: dict[str, Any]) -> dict[str, Any]:
    study = ((payload.get("study") or {}).get(OSDR_STUDY_ID) or {})
    meta_list = study.get("studies") or []
    meta = meta_list[0] if meta_list else {}
    return {
        "source": "NASA Open Science Data Repository (OSDR)",
        "url": OSDR_STUDY_URL,
        "study_id": OSDR_STUDY_ID,
        "title": meta.get("title") or "ISS Arabidopsis thaliana Spaceflight Cell-Wall Study (OSD-615)",
        "description": (meta.get("description") or "")[:360],
        "biological_role": "Photoperiod & LED scheduling baseline for regenerative O2/CO2 and dry cellulose biomass reserve (SoC_bio).",
    }


def _parse_celestrak_gp(rows: list[dict[str, Any]]) -> dict[str, Any]:
    iss = next(
        (r for r in rows if "ISS" in str(r.get("OBJECT_NAME", "")).upper()),
        rows[0] if rows else {},
    )
    mean_motion = float(iss.get("MEAN_MOTION") or 15.49)
    period_min = round(1440.0 / max(0.1, mean_motion), 2)
    eclipse_fraction = 0.35
    return {
        "source": "CelesTrak GP JSON (NORAD)",
        "url": CELESTRAK_STATIONS_URL,
        "objects_count": len(rows),
        "object_name": iss.get("OBJECT_NAME", "ISS (ZARYA)"),
        "epoch": iss.get("EPOCH"),
        "mean_motion_rev_day": round(mean_motion, 4),
        "inclination_deg": iss.get("INCLINATION"),
        "orbital_period_min": period_min,
        "approx_eclipse_min": round(period_min * eclipse_fraction, 1),
        "approx_eclipse_pct": int(eclipse_fraction * 100),
    }


def fetch_space_analog(timeout: float = 8.0) -> dict[str, Any]:
    now_utc = datetime.now(timezone.utc).isoformat()
    statuses: dict[str, str] = {}

    try:
        r_dsn = httpx.get(DSN_URL, timeout=timeout, follow_redirects=True)
        r_dsn.raise_for_status()
        dsn = _parse_dsn_xml(r_dsn.text)
        statuses["dsn"] = "live"
    except Exception:
        statuses["dsn"] = "fallback"
        dsn = {
            "source": "NASA Deep Space Network Now",
            "url": DSN_URL,
            "stations_count": 3,
            "stations": ["Goldstone", "Madrid", "Canberra"],
            "total_dishes": 12,
            "active_dishes_count": 3,
            "sample_active": [],
        }

    try:
        r_osdr = httpx.get(OSDR_STUDY_URL, timeout=timeout, follow_redirects=True)
        r_osdr.raise_for_status()
        osdr = _parse_osdr_study(r_osdr.json())
        statuses["osdr"] = "live"
    except Exception:
        statuses["osdr"] = "fallback"
        osdr = _parse_osdr_study({})

    try:
        r_cel = httpx.get(CELESTRAK_STATIONS_URL, timeout=timeout, follow_redirects=True)
        r_cel.raise_for_status()
        celestrak = _parse_celestrak_gp(r_cel.json())
        statuses["celestrak"] = "live"
    except Exception:
        statuses["celestrak"] = "fallback"
        celestrak = _parse_celestrak_gp([])

    return {
        "fetched_at_utc": now_utc,
        "feed_statuses": statuses,
        "dsn": dsn,
        "osdr": osdr,
        "celestrak": celestrak,
        "existing_clients": [
            {"id": "jpl_horizons", "label": "JPL Horizons Ephemeris (Mars=499, Moon=301)", "status": "configured_client"},
            {"id": "mars_meda", "label": "PDS Mars 2020 Perseverance MEDA (DER_WS, CAL_RDS, CAL_ATS)", "status": "configured_client"},
        ],
        "mpto_frontiers": MPTO_FRONTIERS,
    }


def write_space_analog_cache(output_paths: list[Path], timeout: float = 8.0) -> dict[str, Any]:
    payload = fetch_space_analog(timeout=timeout)
    serialized = json.dumps(payload, indent=2, ensure_ascii=False)
    for path in output_paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(serialized, encoding="utf-8")
    return payload
