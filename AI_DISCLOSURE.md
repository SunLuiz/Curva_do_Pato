# AI Disclosure

In compliance with the **NASA Space Apps Challenge 2026** rules on transparency and attribution, this document declares how artificial intelligence tools were used in building **Cockpit-OMNI**.

## Scope of AI Assistance

- **Code Scaffolding & API Integration:** AI coding assistants were used to help structure the FastAPI backend, statistical pipeline boilerplate (`pymannkendall` + `scipy.stats.theilslopes`), test suite, and frontend scaffolding.
- **Documentation & Translation:** AI assisted in drafting and translating English documentation (`README.md`, `REFERENCES.md`, UI copy) from the team's planning notes.

## Human Verification & Scientific Integrity

- **Statistical Computations:** All Mann-Kendall tests, deseasonalized Theil-Sen slopes, confidence intervals, and Clear-Sky/All-Sky comparisons are computed deterministically using standard statistical libraries (`pymannkendall`, `scipy`, `pandas`, `numpy`) directly on open NASA datasets — never fabricated or approximated by an LLM.
- **Endpoint & Data Verification:** Every NASA API endpoint, dataset identifier (`VIIRS_NOAA21_NRT`, `T2M`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, `RH2M`, `DONKI`), and sample output was executed and verified by the team.
- **Branding Compliance:** No AI tool was used to generate, alter, or composite the NASA insignia/logo or any official Space Apps marks.
