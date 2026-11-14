/**
 * Five Academy investigation modules (5 questions each, >=5 required by mastery gate).
 * Every scientific claim, threshold, p-value, slope, and CI is verified against
 * frontend/public/cache/trend_*.json by scripts/verify_answers.mjs.
 * Every question works 100% offline with built-in hints and explanations.
 */

export const MODULES = [
  {
    id: "M1",
    badgeId: "season-breaker",
    title: "Seasonality & Signal",
    subtitle: "Why naive tests miss climate trends — and how Seasonal Mann-Kendall rescues them.",
    tone: "--biome-se",
    questions: [
      {
        id: "m1-q1",
        critical: false,
        seriesRef: { region: "campinas", variable: "ALLSKY_SFC_SW_DWN" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "ALLSKY_SFC_SW_DWN", label: "Campinas All-Sky Irradiance" },
        cacheCheck: {
          region: "campinas",
          variable: "ALLSKY_SFC_SW_DWN",
          asserts: {
            significant_5pct: true,
            p_value: 0.0008616,
            original_p_value: 0.1968,
            original_trend: "no trend",
            slope_per_decade: 0.1621,
          },
        },
        promptByDepth: {
          explorer:
            "In Campinas, sunshine rises every summer and drops every winter. A plain trend test saw p = 0.197 ('no trend'), while our seasonal test found a clear brightening trend (p = 0.00086). Why did they disagree?",
          analyst:
            "For Campinas All-Sky Irradiance (1984-2025, n = 504), standard Mann-Kendall returns p = 0.1968 (no trend), whereas Seasonal Mann-Kendall returns p = 0.0008616 (+0.1621 MJ/m2/day per decade). What explains the difference?",
          specialist:
            "Campinas ALLSKY_SFC_SW_DWN exhibits original_tau = 0.038 (p = 0.1968) vs. Seasonal Mann-Kendall tau = 0.103 (p = 0.0008616, Theil-Sen +0.1621 MJ/m2/day/dec). Why does blocking by period=12 rescue statistical power?",
        },
        options: [
          "Large regular summer-winter swings inflate variance when January is mixed with July; comparing like months isolates the multi-decade drift.",
          "The seasonal test removes the most recent 10 years of data to reduce solar variability.",
          "Standard Mann-Kendall assumes data follow a Gaussian bell curve with zero outliers.",
          "Irradiance only increases in leap years when MERRA-2 switches sensors.",
        ],
        correctIndex: 0,
        hint: "Think about comparing January against past Januaries instead of mixing winter and summer points in one pool.",
        explain:
          "Because Campinas sits at 22.9 S, summer vs. winter irradiance swings dwarf a +0.1621 MJ/m2/day/decade multi-decade shift. Seasonal Mann-Kendall (period = 12) tests each calendar month across years and aggregates the block statistics, surfacing p = 0.0008616.",
      },
      {
        id: "m1-q2",
        critical: false,
        seriesRef: { region: "campinas", variable: "T2M" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "T2M", label: "Campinas 2m Temperature" },
        cacheCheck: {
          region: "campinas",
          variable: "T2M",
          asserts: {
            significant_5pct: true,
            slope_per_decade: 0.4091,
            total_change: 1.718,
            n: 504,
          },
        },
        promptByDepth: {
          explorer:
            "Look at Campinas 2m temperature from 1984 to 2025 (504 monthly readings). How much did Campinas warm overall across those 42 years?",
          analyst:
            "Campinas T2M shows a deseasonalized Theil-Sen slope of +0.4091 C/decade (95% CI [0.3329, 0.4891]). Over the 42-year span (1984-2025), what is the net total warming?",
          specialist:
            "Given Campinas T2M Seasonal MK (tau = 0.293, p < 1e-16, slope_per_decade = +0.4091 C/dec, n = 504), which reported cumulative shift matches the frozen series?",
        },
        options: [
          "+1.718 C total (+0.4091 C per decade)",
          "+0.172 C total (within measurement noise)",
          "+4.091 C total",
          "No significant warming was detected (p > 0.05)",
        ],
        correctIndex: 0,
        hint: "Multiply roughly +0.409 C/decade by 4.2 decades (42 years).",
        explain:
          "Campinas warmed at +0.4091 C/decade across 4.2 decades (1984-2025), yielding +1.718 C cumulative warming with tau = 0.293 and p < 1e-16.",
      },
      {
        id: "m1-q3",
        critical: false,
        seriesRef: { region: "campinas", variable: "RH2M" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "RH2M", label: "Campinas Relative Humidity" },
        cacheCheck: {
          region: "campinas",
          variable: "RH2M",
          asserts: {
            significant_5pct: true,
            slope_per_decade: -1.6601,
            total_change: -6.972,
            trend: "decreasing",
          },
        },
        promptByDepth: {
          explorer:
            "As Campinas warmed by +1.72 C, what happened to relative humidity near the ground (RH2M) over those same 42 years?",
          analyst:
            "Compare Campinas RH2M alongside T2M: what significant change occurred in near-surface relative humidity between 1984 and 2025?",
          specialist:
            "For Campinas RH2M (1984-2025), identify the correct Seasonal MK + deseasonalized Theil-Sen result:",
        },
        options: [
          "It dried significantly: -1.6601 %/decade (-6.972 % total shift, p < 1e-16).",
          "It stayed statistically flat because warmer air always stays saturated.",
          "It jumped sharply upward (+3.2 %/decade) after 2010.",
          "Humidity measurements are unavailable in NASA POWER before 2005.",
        ],
        correctIndex: 0,
        hint: "Warming air can hold more water vapor; paired with falling rain (-0.272 mm/day/dec), relative humidity drops.",
        explain:
          "Campinas relative humidity dropped -1.6601 percentage points per decade (-6.972 % cumulative, tau = -0.296, p < 1e-16), compounding warming and precipitation decline.",
      },
      {
        id: "m1-q4",
        critical: false,
        seriesRef: { region: "campinas", variable: "CLRSKY_SFC_SW_DWN" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "CLRSKY_SFC_SW_DWN", label: "Campinas Clear-Sky Irradiance" },
        cacheCheck: {
          region: "campinas",
          variable: "CLRSKY_SFC_SW_DWN",
          asserts: {
            significant_5pct: true,
            original_p_value: 0.14,
            original_trend: "no trend",
            tau: 0.322,
            slope_per_decade: 0.1897,
          },
        },
        promptByDepth: {
          explorer:
            "Clear-sky sunlight in Campinas (measured when no clouds are present) also fools the raw trend test (p = 0.14). What did the seasonal test find?",
          analyst:
            "For Campinas CLRSKY_SFC_SW_DWN, original Mann-Kendall shows p = 0.14 ('no trend'). What happens under Seasonal Mann-Kendall?",
          specialist:
            "Evaluate Campinas CLRSKY_SFC_SW_DWN (original_p = 0.14) after seasonal stratification (period = 12):",
        },
        options: [
          "A strong upward trend appears: tau = 0.322, p < 1e-16, slope = +0.1897 MJ/m2/day/decade.",
          "It remains 'no trend' even after deseasonalizing because clear-sky radiation is solar-constant fixed.",
          "It reverses sign to a sharp decreasing trend (-0.40 MJ/m2/day/decade).",
          "The test throws out half the years as missing cloud-free days.",
        ],
        correctIndex: 0,
        hint: "Just like All-Sky irradiance, seasonal sun angles mask clear-sky transmittance changes until months are matched.",
        explain:
          "Seasonal Mann-Kendall reveals tau = 0.322 (p < 1e-16) and +0.1897 MJ/m2/day/decade — proving clear-sky transmittance itself shifted independently of clouds.",
      },
      {
        id: "m1-q5",
        critical: true,
        seriesRef: { region: "campinas", variable: "T2M" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "T2M", label: "Significance Guardrail" },
        cacheCheck: {
          region: "campinas",
          variable: "T2M",
          asserts: {
            n: 504,
            significant_5pct: true,
          },
        },
        promptByDepth: {
          explorer:
            "Our core rule is 'Significance before narrative.' What does that mean when someone shows you an upward line on a climate graph?",
          analyst:
            "Why must every series pass Seasonal Mann-Kendall (p < 0.05) and deseasonalized Theil-Sen before Cockpit writes any causal narrative?",
          specialist:
            "Why does Cockpit-OMNI enforce p < 0.05 (Seasonal MK + Hamed-Rao diagnostic) as an architectural gate prior to causal attribution?",
        },
        options: [
          "Random fluctuations almost always create a non-zero slope by eye; testing significance stops us from inventing stories about noise.",
          "A p-value under 0.05 proves human CO2 emissions caused that exact local wiggle.",
          "Deseasonalizing increases the visual steepness of every chart for dramatic slides.",
          "Because NASA POWER only updates series whose p-value is below 0.05.",
        ],
        correctIndex: 0,
        hint: "Even a pure coin-flip random walk yields a slight non-zero slope over 42 years.",
        explain:
          "Statistical significance guards against apophenia: we never try to explain 'why a variable changed' until we prove the change is unlikely under seasonal noise (p < 0.05).",
      },
    ],
  },
  {
    id: "M2",
    badgeId: "null-hunter",
    title: "Guess the Trend (Real Data)",
    subtitle: "Inspect five real 504-month NASA POWER series and separate genuine signals from null noise.",
    tone: "--biome-n",
    questions: [
      {
        id: "m2-q1",
        critical: false,
        hideSenInPreview: true,
        seriesRef: { region: "petrolina", variable: "PRECTOTCORR" },
        cockpitLink: { tab: "trend", region: "petrolina", variable: "PRECTOTCORR", label: "Petrolina Precipitation" },
        cacheCheck: {
          region: "petrolina",
          variable: "PRECTOTCORR",
          asserts: {
            significant_5pct: true,
            trend: "decreasing",
            p_value: 0.0291,
            slope_per_decade: -0.0721,
          },
        },
        promptByDepth: {
          explorer:
            "Preview this 42-year rain chart for semi-arid Petrolina-PE. Notice the noisy spikes from wet vs. dry years. What did our seasonal test find?",
          analyst:
            "Inspect Petrolina Bias-Corrected Precipitation (PRECTOTCORR, 1984-2025). What is the verified Seasonal MK verdict at alpha = 0.05?",
          specialist:
            "Classify Petrolina PRECTOTCORR (1984-2025, 504 monthly observations) under Seasonal Mann-Kendall:",
        },
        options: [
          "Statistically significant decreasing trend (p = 0.0291, slope -0.0721 mm/day/decade).",
          "No statistically significant trend (pure seasonal rainfall noise, p = 0.54).",
          "Statistically significant increasing rainfall trend (+0.21 mm/day/decade).",
          "Inconclusive because semi-arid regions always fail Mann-Kendall.",
        ],
        correctIndex: 0,
        hint: "Look closely below the occasional flood spikes: dry-season and baseline medians tilt mildly downward (p just under 0.05).",
        explain:
          "Despite dramatic interannual spikes in the Caatinga, Seasonal MK yields tau = -0.068, p = 0.0291 (< 0.05), slope -0.0721 mm/day/decade (95% CI [-0.1265, -0.025]).",
      },
      {
        id: "m2-q2",
        critical: false,
        hideSenInPreview: true,
        seriesRef: { region: "petrolina", variable: "WS2M" },
        cockpitLink: { tab: "trend", region: "petrolina", variable: "WS2M", label: "Petrolina 2m Wind Speed" },
        cacheCheck: {
          region: "petrolina",
          variable: "WS2M",
          asserts: {
            significant_5pct: false,
            trend: "no trend",
            p_value: 0.1734,
            slope_per_decade: -0.0138,
          },
        },
        promptByDepth: {
          explorer:
            "Petrolina sits in Brazil's Northeast wind and solar corridor. Looking at 42 years of 2m surface wind speed (WS2M), is there a real trend?",
          analyst:
            "Evaluate Petrolina 2m Wind Speed (WS2M, 1984-2025). The raw point slope is -0.0138 m/s/decade. Does it pass significance?",
          specialist:
            "Classify Petrolina WS2M (Seasonal MK period = 12, alpha = 0.05):",
        },
        options: [
          "No statistically significant trend (p = 0.1734 >= 0.05; cannot reject seasonal noise).",
          "Significant accelerating wind trend (+0.14 m/s/decade, p = 0.002).",
          "Significant wind stilling collapse (-0.30 m/s/decade, p < 0.001).",
          "Significant upward shift only in El Nino winters.",
        ],
        correctIndex: 0,
        hint: "A tiny negative sample slope (-0.0138) means nothing if the p-value stays well above 0.05.",
        explain:
          "Petrolina WS2M shows tau = -0.042 and p = 0.1734 (>= 0.05). The verdict is strictly 'no trend' — we refuse to invent a wind-decline story.",
      },
      {
        id: "m2-q3",
        critical: false,
        hideSenInPreview: true,
        seriesRef: { region: "manaus", variable: "T2M" },
        cockpitLink: { tab: "trend", region: "manaus", variable: "T2M", label: "Manaus 2m Temperature" },
        cacheCheck: {
          region: "manaus",
          variable: "T2M",
          asserts: {
            significant_5pct: true,
            trend: "increasing",
            tau: 0.381,
            slope_per_decade: 0.3065,
          },
        },
        promptByDepth: {
          explorer:
            "Now jump to the Central Amazon rainforest in Manaus-AM. Even inside a humid forest basin, what happened to 2m temperature since 1984?",
          analyst:
            "Inspect Manaus-AM T2M (1984-2025). Notice how consistent the upward drift is relative to temperature amplitude. What is the verdict?",
          specialist:
            "Characterize Manaus T2M under Seasonal Mann-Kendall and Theil-Sen:",
        },
        options: [
          "Significant warming (+0.3065 C/decade, +1.287 C total, tau = 0.381, p < 1e-16).",
          "No significant trend because rainforest evapotranspiration holds temperatures constant.",
          "Cooling trend (-0.15 C/decade) due to increased cloud cover.",
          "Warming only inside urban Manaus with tau near zero.",
        ],
        correctIndex: 0,
        hint: "Compare Kendall's tau here (0.381) — it is actually higher than Campinas (0.293) because Amazon baseline seasonality is narrow!",
        explain:
          "Manaus warmed +0.3065 C/decade (+1.287 C total, 95% CI [0.2543, 0.3593]). Its narrow tropical seasonal swing yields an even stronger rank correlation (tau = 0.381, p < 1e-16).",
      },
      {
        id: "m2-q4",
        critical: false,
        hideSenInPreview: true,
        seriesRef: { region: "campinas", variable: "CLOUD_ATTEN_PCT" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "CLOUD_ATTEN_PCT", label: "Campinas Cloud Deficit" },
        cacheCheck: {
          region: "campinas",
          variable: "CLOUD_ATTEN_PCT",
          asserts: {
            significant_5pct: false,
            trend: "no trend",
            p_value: 0.9476,
            slope_per_decade: 0.0378,
          },
        },
        promptByDepth: {
          explorer:
            "This series tracks how much sunlight clouds block over Campinas (CLOUD_ATTEN_PCT). Did Campinas get noticeably less cloudy over 42 years?",
          analyst:
            "Examine Campinas Cloud Attenuation Deficit (CLOUD_ATTEN_PCT = 1 - AllSky/ClearSky). What is the verified statistical verdict?",
          specialist:
            "Inspect Campinas CLOUD_ATTEN_PCT (Seasonal MK tau = 0.002). What is its significance classification?",
        },
        options: [
          "No trend (p = 0.9476, essentially flat around ~19.6%; clouds did not drive Campinas brightening).",
          "Steep cloud collapse (-1.2 %/decade, p < 0.001).",
          "Significant cloud thickening (+0.8 %/decade, p = 0.012).",
          "Data are corrupted because percentages cannot exceed 10%.",
        ],
        correctIndex: 0,
        hint: "With p = 0.9476 (nearly 1.0!) and tau = 0.002, this is as close to pure zero drift as real Earth data gets.",
        explain:
          "Campinas cloud attenuation has tau = 0.002 and p = 0.9476 (95% CI [-0.3877, +0.4698] %/dec). That crucial null result rules out cloud decline as the primary driver of Campinas brightening.",
      },
      {
        id: "m2-q5",
        critical: true,
        hideSenInPreview: true,
        seriesRef: { region: "manaus", variable: "PRECTOTCORR" },
        cockpitLink: { tab: "trend", region: "manaus", variable: "PRECTOTCORR", label: "Manaus Precipitation" },
        cacheCheck: {
          region: "manaus",
          variable: "PRECTOTCORR",
          asserts: {
            significant_5pct: true,
            trend: "decreasing",
            p_value: 4.238e-11,
            slope_per_decade: -0.4673,
            total_change: -1.963,
          },
        },
        promptByDepth: {
          explorer:
            "Final M2 case: look at Manaus rainfall (PRECTOTCORR) from 1984 to 2025. Heavy rainforest rains bounce wildly between months — did total rain still drop significantly?",
          analyst:
            "Audit Manaus PRECTOTCORR (1984-2025): slope is -0.4673 mm/day/decade (-1.963 mm/day total). Is that real drying or rainforest variance noise?",
          specialist:
            "Unassisted check: assess Manaus PRECTOTCORR under Seasonal MK (1984-2025, n = 504):",
        },
        options: [
          "Significant decreasing rainfall trend (-0.4673 mm/day/dec, p = 4.24e-11, tau = -0.204).",
          "No trend (rainforest noise swallows any drift, p > 0.25).",
          "Significant increasing rainfall (+0.47 mm/day/decade).",
          "Only dry-season August declines while total signal has p = 0.49.",
        ],
        correctIndex: 0,
        hint: "Look past tropical variance: even p = 4.24e-11 means less than one-in-twenty-billion odds under seasonal stationarity.",
        explain:
          "Manaus shows the steepest absolute rainfall decline of the three reference stations: -0.4673 mm/day/decade (-1.963 mm/day total, p = 4.24e-11), consistent with Amazon drying + cloud-attenuation thinning.",
      },
    ],
  },
  {
    id: "M3",
    badgeId: "slope-auditor",
    title: "Theil-Sen & 95% Confidence Intervals",
    subtitle: "Read non-parametric magnitudes, cumulative deltas, and zero-crossing confidence bounds.",
    tone: "--biome-se",
    questions: [
      {
        id: "m3-q1",
        critical: false,
        seriesRef: { region: "campinas", variable: "T2M" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "T2M", label: "Theil-Sen Median Slope" },
        cacheCheck: {
          region: "campinas",
          variable: "T2M",
          asserts: {
            slope_per_decade: 0.4091,
            ci_95_per_decade: [0.3329, 0.4891],
          },
        },
        promptByDepth: {
          explorer:
            "Why do climate detectives prefer the 'Theil-Sen median slope' over an ordinary textbook straight-line fit when hot El Nino years appear?",
          analyst:
            "Cockpit estimates +0.4091 C/decade for Campinas T2M using deseasonalized Theil-Sen instead of OLS. What makes Theil-Sen superior here?",
          specialist:
            "What statistical property justifies Sen's pairwise median slope (+0.4091 C/dec, 95% CI [0.3329, 0.4891]) over Gaussian OLS on monthly climate series?",
        },
        options: [
          "Taking the median of pairwise same-month slopes ignores extreme heatwave outliers (~29.3% breakdown point) and needs no normality assumption.",
          "Theil-Sen automatically predicts the next solar cycle 10 years ahead.",
          "Theil-Sen forces the intercept through 0 C so percentages add up cleanly.",
          "Ordinary least squares cannot run on more than 100 data points.",
        ],
        correctIndex: 0,
        hint: "What happens to a median vs. a mean when one single year spikes abnormally high or low?",
        explain:
          "Theil-Sen computes the median slope across pairwise points in matching calendar months, making it non-parametric and resilient against isolated El Nino/La Nina outliers.",
      },
      {
        id: "m3-q2",
        critical: false,
        seriesRef: { region: "petrolina", variable: "ALLSKY_SFC_SW_DWN" },
        cockpitLink: { tab: "trend", region: "petrolina", variable: "ALLSKY_SFC_SW_DWN", label: "Petrolina Solar Brightening" },
        cacheCheck: {
          region: "petrolina",
          variable: "ALLSKY_SFC_SW_DWN",
          asserts: {
            slope_per_decade: 0.2558,
            total_change: 1.075,
            p_value: 9.384e-9,
          },
        },
        promptByDepth: {
          explorer:
            "All three biomes brightened in surface sunlight (All-Sky SW) since 1984: Campinas +0.162, Manaus +0.241, Petrolina +0.256 MJ/m2/day per decade. Which brightened fastest?",
          analyst:
            "Compare decadal All-Sky irradiance slopes: Campinas (+0.1621), Manaus (+0.2413), Petrolina (+0.2558 MJ/m2/day/dec). What is Petrolina's cumulative 42-year irradiance gain?",
          specialist:
            "Rank ALLSKY_SFC_SW_DWN decadal slopes across biomes and verify Petrolina's cumulative 42-year delta:",
        },
        options: [
          "Petrolina brightened fastest (+0.2558 MJ/m2/day/decade), gaining +1.075 MJ/m2/day total over 42 years.",
          "Campinas brightened fastest because it had the warmest air temperature.",
          "All three gained less than +0.05 MJ/m2/day total, making them equal.",
          "Manaus dimmed sharply rather than brightening.",
        ],
        correctIndex: 0,
        hint: "Compare 0.2558 vs 0.2413 vs 0.1621, and multiply 0.2558 by 4.2 decades.",
        explain:
          "Petrolina leads surface brightening at +0.2558 MJ/m2/day/decade (+1.075 MJ/m2/day total, p = 9.38e-9), closely followed by Manaus (+0.2413) and Campinas (+0.1621).",
      },
      {
        id: "m3-q3",
        critical: false,
        seriesRef: { region: "petrolina", variable: "CLRSKY_SFC_SW_DWN" },
        cockpitLink: { tab: "trend", region: "petrolina", variable: "CLRSKY_SFC_SW_DWN", label: "Petrolina Clear-Sky CI" },
        cacheCheck: {
          region: "petrolina",
          variable: "CLRSKY_SFC_SW_DWN",
          asserts: {
            significant_5pct: false,
            slope_per_decade: 0.0127,
            p_value: 0.2901,
          },
        },
        promptByDepth: {
          explorer:
            "Petrolina's clear-sky sunlight has a tiny positive number (+0.0127), yet Cockpit marks it gray 'No Trend' (p = 0.2901). Why?",
          analyst:
            "For Petrolina CLRSKY_SFC_SW_DWN, slope is +0.0127 MJ/m2/day/decade, p = 0.2901, and the 95% confidence band spans negative to positive values. What must the verdict be?",
          specialist:
            "Given Petrolina CLRSKY_SFC_SW_DWN (tau = 0.033, p = 0.2901, slope = +0.0127), why is reporting '+0.013 clear-sky brightening' disallowed?",
        },
        options: [
          "A positive point estimate with p >= 0.05 and a zero-crossing confidence interval is indistinguishable from zero change.",
          "Because slopes smaller than +0.10 are rounded down by NASA APIs.",
          "Because clear-sky irradiance can never increase in semi-arid climates.",
          "Because 504 months is too short to compute any confidence interval.",
        ],
        correctIndex: 0,
        hint: "If the 95% range includes negative, zero, and positive slopes, can you declare an upward trend?",
        explain:
          "At p = 0.2901 and tau = 0.033, the plausible decadal slope spans zero. Cockpit enforces null honesty: never headline a non-zero slope whose test fails p < 0.05.",
      },
      {
        id: "m3-q4",
        critical: false,
        seriesRef: { region: "manaus", variable: "CLOUD_ATTEN_PCT" },
        cockpitLink: { tab: "trend", region: "manaus", variable: "CLOUD_ATTEN_PCT", label: "Manaus Cloud Attenuation" },
        cacheCheck: {
          region: "manaus",
          variable: "CLOUD_ATTEN_PCT",
          asserts: {
            significant_5pct: true,
            slope_per_decade: -0.8552,
            total_change: -3.592,
            p_value: 3.015e-8,
          },
        },
        promptByDepth: {
          explorer:
            "Manaus 'Cloud Attenuation Deficit' fell by -3.59 % over 42 years (-0.855 % per decade). Does a NEGATIVE cloud attenuation trend mean MORE clouds or FEWER clouds blocking the sun?",
          analyst:
            "Cloud Attenuation Deficit = (1 - AllSky / ClearSky) * 100%. In Manaus, it changed at -0.8552 %/decade (-3.592 % total, p = 3.015e-8). Physically, what does that negative slope signify?",
          specialist:
            "Interpret the negative Theil-Sen slope (-0.8552 %/dec, total -3.592 %, p = 3.015e-8) of CLOUD_ATTEN_PCT in Manaus-AM:",
        },
        options: [
          "Clouds attenuated LESS sunlight over time (thinned cloud attenuation deficit, letting more All-Sky solar energy reach the forest).",
          "Clouds blocked MORE sunlight over time, cooling the canopy.",
          "Clear-sky aerosol concentration tripled over the Amazon basin.",
          "Satellite sensors failed whenever cloud fraction dropped below 50%.",
        ],
        correctIndex: 0,
        hint: "When attenuation (blocking) goes DOWN (negative slope), more sunlight passes through clouds to the surface.",
        explain:
          "Lower attenuation means clouds are blocking a smaller fraction of incoming sunlight (-3.592 percentage points since 1984), directly explaining how Manaus All-Sky irradiance rose while Clear-Sky stayed flat.",
      },
      {
        id: "m3-q5",
        critical: true,
        seriesRef: { region: "campinas", variable: "PRECTOTCORR" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "PRECTOTCORR", label: "Campinas Combined Drying" },
        cacheCheck: {
          region: "campinas",
          variable: "PRECTOTCORR",
          asserts: {
            significant_5pct: true,
            slope_per_decade: -0.2724,
            total_change: -1.144,
            p_value: 0.00000159,
          },
        },
        promptByDepth: {
          explorer:
            "Combine two clues in Campinas: rainfall dropped (-1.144 mm/day total) while temperature climbed (+1.718 C). What kind of climate stress does that compound shift create?",
          analyst:
            "Unassisted check: Campinas shows T2M +0.4091 C/dec, PRECTOTCORR -0.2724 mm/day/dec (p = 1.59e-6), and RH2M -1.6601 %/dec. What physical risk emerges from these three significant trends together?",
          specialist:
            "Synthesize Campinas T2M (+0.4091 C/dec), PRECTOTCORR (-0.2724 mm/day/dec, CI excluding 0), and RH2M (-1.6601 %/dec) into an Earth-system attribution:",
        },
        options: [
          "Compound hydrometeorological drying: hotter air + less rain + lower relative humidity increases evaporative demand and water/fire sensitivity.",
          "Pure marine cooling with rising summer flood risk everywhere.",
          "Zero operational impact because monthly averages cancel day-night highs.",
          "Proof that wind turbines in Campinas slowed down atmospheric moisture.",
        ],
        correctIndex: 0,
        hint: "Hotter + drier + less rain is a classic triple hydroclimatic shift.",
        explain:
          "Every one of those three signals passes p < 0.00001 with confidence bounds far from zero: Campinas got +1.718 C warmer, -6.972 % less humid, and -1.144 mm/day drier.",
      },
    ],
  },
  {
    id: "M4",
    badgeId: "cloud-buster",
    title: "Cloud vs. Aerosol Attribution",
    subtitle: "Falsify single-cause stories: Campinas vs. Manaus/Petrolina prove two opposite brightening engines.",
    tone: "--biome-ne",
    questions: [
      {
        id: "m4-q1",
        critical: true,
        seriesRef: { region: "campinas", variable: "CLOUD_ATTEN_PCT" },
        cockpitLink: { tab: "attribution", region: "campinas", variable: "CLRSKY_SFC_SW_DWN", label: "Campinas Attribution Vectors" },
        cacheCheck: {
          region: "campinas",
          variable: "CLOUD_ATTEN_PCT",
          asserts: {
            significant_5pct: false,
            p_value: 0.9476,
          },
        },
        promptByDepth: {
          explorer:
            "Critical falsification test! Campinas receives more surface sunlight today (All-Sky p = 0.00086). Yet Cloud Attenuation is flat (p = 0.948) while Clear-Sky sunlight jumped (+0.190/dec, p < 1e-16). What caused Campinas to brighten?",
          analyst:
            "Critical check: In Campinas, ALLSKY_SFC_SW_DWN rose (+0.1621, p = 0.00086), CLOUD_ATTEN_PCT shows NO trend (p = 0.9476), and CLRSKY_SFC_SW_DWN climbed sharply (+0.1897, p < 1e-16). Which physical hypothesis survives falsification?",
          specialist:
            "Critical unassisted attribution: Given Campinas CLOUD_ATTEN_PCT p = 0.9476 (null) vs. CLRSKY_SFC_SW_DWN tau = 0.322 (p < 1e-16), deduce the dominant radiative regime:",
        },
        options: [
          "Clear-sky atmospheric transmittance (aerosol/cleaner-air or column water-vapor change) drove Campinas brightening — NOT cloud disappearance.",
          "Campinas became nearly cloud-free after 2000 while aerosols stayed flat.",
          "Increased biomass burning smoke brightened the surface directly by reflecting UV downward.",
          "The clear-sky channel must be ignored because clouds always explain 100% of solar changes.",
        ],
        correctIndex: 0,
        hint: "If clouds are flat (p = 0.9476) while cloud-free sky (CLRSKY) jumped dramatically (tau = 0.322), look at the air between sun and sensor!",
        explain:
          "Because cloud attenuation in Campinas shows zero trend (p = 0.9476), cloud cover did NOT thin there. Instead, Clear-Sky irradiance surged +0.1897 MJ/m2/day/decade (p < 1e-16), implicating atmospheric aerosol or column moisture transmittance.",
      },
      {
        id: "m4-q2",
        critical: false,
        seriesRef: { region: "manaus", variable: "CLOUD_ATTEN_PCT" },
        cockpitLink: { tab: "attribution", region: "manaus", variable: "CLOUD_ATTEN_PCT", label: "Manaus Cloud Deficit" },
        cacheCheck: {
          region: "manaus",
          variable: "CLRSKY_SFC_SW_DWN",
          asserts: {
            significant_5pct: false,
            p_value: 0.7686,
            slope_per_decade: 0.0289,
          },
        },
        promptByDepth: {
          explorer:
            "Now flip to Manaus in the Amazon! Here, Cloud Attenuation fell sharply (p = 3.0e-8), while Clear-Sky sunlight stayed completely flat (p = 0.769). What drove Manaus brightening?",
          analyst:
            "In Manaus, CLOUD_ATTEN_PCT declined (-0.8552 %/dec, p = 3.015e-8) while CLRSKY_SFC_SW_DWN shows no trend (p = 0.7686). Contrast that against Campinas.",
          specialist:
            "Compare Manaus radiative attribution (CLOUD_ATTEN_PCT tau = -0.172, p = 3.015e-8; CLRSKY tau = 0.009, p = 0.7686) to Campinas:",
        },
        options: [
          "Cloud attenuation thinning drove Manaus brightening (opposite mechanism from Campinas).",
          "Manaus and Campinas share the exact same aerosol-driven regime.",
          "Both cloud attenuation and clear-sky transmittance stayed non-significant in Manaus.",
          "Manaus solar radiation dropped because rainfall fell.",
        ],
        correctIndex: 0,
        hint: "In Manaus, Clear-Sky is flat (p = 0.769) and Clouds changed (p = 3e-8) — the mirror opposite of Campinas.",
        explain:
          "Manaus CLRSKY_SFC_SW_DWN has p = 0.7686 (null), proving background clear-sky transmittance did not trend significantly. Instead, reduced cloud attenuation (-3.592 % over 42 years) let more solar radiation reach the surface.",
      },
      {
        id: "m4-q3",
        critical: false,
        seriesRef: { region: "petrolina", variable: "CLOUD_ATTEN_PCT" },
        cockpitLink: { tab: "attribution", region: "petrolina", variable: "CLOUD_ATTEN_PCT", label: "Petrolina Cloud Deficit" },
        cacheCheck: {
          region: "petrolina",
          variable: "CLOUD_ATTEN_PCT",
          asserts: {
            significant_5pct: true,
            slope_per_decade: -0.9647,
            p_value: 2.833e-9,
          },
        },
        promptByDepth: {
          explorer:
            "What about semi-arid Petrolina-PE? Its Clear-Sky test is flat (p = 0.290), while Cloud Attenuation plunged (-0.965 %/decade, p = 2.8e-9). Which twin does Petrolina match?",
          analyst:
            "Petrolina shows CLRSKY_SFC_SW_DWN p = 0.2901 (null) and CLOUD_ATTEN_PCT -0.9647 %/decade (p = 2.833e-9). Which attribution pattern does it belong to?",
          specialist:
            "Classify Petrolina-PE's radiative brightening mechanism relative to Manaus-AM and Campinas-SP:",
        },
        options: [
          "Manaus-like cloud-thinning regime (clouds attenuated less radiation; clear sky shows no trend).",
          "Campinas-like industrial aerosol clearing regime.",
          "Neither — Petrolina showed zero All-Sky irradiance change.",
          "Heliophysical solar flare brightening.",
        ],
        correctIndex: 0,
        hint: "Check which channel is p < 0.05 in Petrolina: CLOUD_ATTEN_PCT (p = 2.8e-9) or CLRSKY (p = 0.2901)?",
        explain:
          "Petrolina's Cloud Attenuation Deficit fell even faster than Manaus (-0.9647 vs -0.8552 %/decade) while its Clear-Sky stayed null (p = 0.2901). Both Petrolina and Manaus brightened via cloud thinning, while Campinas brightened via clear-sky transmittance.",
      },
      {
        id: "m4-q4",
        critical: true,
        seriesRef: { region: "campinas", variable: "CLRSKY_SFC_SW_DWN" },
        cockpitLink: { tab: "attribution", region: "campinas", variable: "CLRSKY_SFC_SW_DWN", label: "Falsify One-Size-Fits-All" },
        cacheCheck: {
          region: "manaus",
          variable: "CLOUD_ATTEN_PCT",
          asserts: {
            significant_5pct: true,
            slope_per_decade: -0.8552,
          },
        },
        promptByDepth: {
          explorer:
            "Critical check: Suppose a headline claims 'All of Brazil got sunnier for the exact same reason: skies lost clouds everywhere.' Which single comparison in Cockpit falsifies that claim?",
          analyst:
            "Critical falsification check: A policymaker attributes Brazil's solar brightening uniformly to declining cloudiness. How do Campinas vs. Manaus disprove a single national mechanism?",
          specialist:
            "Critical falsification: Construct the minimal bivariate counterfactual from our POWER/CERES matrix proving opposite regional brightening drivers:",
        },
        options: [
          "Campinas has flat CLOUD_ATTEN_PCT (p = 0.948) and rising CLRSKY (p < 1e-16), whereas Manaus/Petrolina have falling CLOUD_ATTEN_PCT (p < 1e-7) and flat CLRSKY (p >= 0.29).",
          "Campinas is colder in July than Manaus, proving seasonal differences.",
          "Because NASA DONKI recorded a minor geomagnetic storm this week.",
          "Because ALLSKY_SFC_SW_DWN rose in Campinas, Manaus, and Petrolina alike.",
        ],
        correctIndex: 0,
        hint: "To disprove 'same cause everywhere', point to the one pair of channels that flips between Campinas and Manaus.",
        explain:
          "One engine produces opposite verdicts across regions: same-sign All-Sky brightening hides a clean attribution split between clear-sky transmittance (Campinas) and cloud attenuation deficit (Petrolina/Manaus).",
      },
      {
        id: "m4-q5",
        critical: false,
        seriesRef: { region: "campinas", variable: "CLRSKY_SFC_SW_DWN" },
        cockpitLink: { tab: "attribution", region: "campinas", variable: "ALLSKY_SFC_SW_DWN", label: "FIRMS Snapshot vs. 42-yr Trend" },
        cacheCheck: {
          region: "campinas",
          variable: "ALLSKY_SFC_SW_DWN",
          asserts: {
            n: 504,
            significant_5pct: true,
          },
        },
        promptByDepth: {
          explorer:
            "In our frozen snapshot, NASA FIRMS shows 3,313 fire detections across Brazil in 24 hours and 0 within 150 km of Campinas. Does '0 fires near Campinas today' disprove a 42-year aerosol trend?",
          analyst:
            "NASA FIRMS VIIRS NOAA-21 shows 3,313 24h Brazil hotspots (0 within 150 km of Campinas). Why doesn't zero nearby fires today contradict a 42-year Campinas Clear-Sky trend?",
          specialist:
            "Distinguish the temporal scale of LANCE FIRMS VIIRS NRT (24h active hotspots) from MERRA-2/CERES 42-year CLRSKY_SFC_SW_DWN trend attribution:",
        },
        options: [
          "No — 24h NRT fire counts diagnose acute present-day smoke risk, while CLRSKY integrates 42 years of regional urban/industrial aerosol and moisture changes.",
          "Yes — zero local fires today proves there was never any aerosol change since 1984.",
          "Yes — unless at least 500 hotspots fall inside 150 km, Seasonal MK flips to 'no trend'.",
          "FIRMS measures underground magma heat rather than surface vegetation fires.",
        ],
        correctIndex: 0,
        hint: "Never mix up a 24-hour live weather snapshot with a 42-year historical baseline.",
        explain:
          "NRT FIRMS hotspot detections monitor immediate smoke/fire anomalies over the past 24 hours (useful for operational context), whereas CLRSKY_SFC_SW_DWN integrates 504 months of radiative atmospheric state.",
      },
    ],
  },
  {
    id: "M5",
    badgeId: "honest-detective",
    title: "Know the Limits (Anti-Hype)",
    subtitle: "Learn when real scientists say 'we cannot predict that with these data' — including WS2M and roadmap sensors.",
    tone: "--null-ink",
    questions: [
      {
        id: "m5-q1",
        critical: true,
        seriesRef: { region: "campinas", variable: "WS2M" },
        cockpitLink: { tab: "trend", region: "campinas", variable: "WS2M", label: "Campinas 2m Wind Speed" },
        cacheCheck: {
          region: "campinas",
          variable: "WS2M",
          asserts: {
            significant_5pct: false,
            p_value: 0.489,
            slope_per_decade: -0.0042,
            ci_95_per_decade: [-0.0191, 0.0103],
          },
        },
        promptByDepth: {
          explorer:
            "Critical honesty test! Campinas 2m wind speed shows slope -0.0042 m/s/dec, p = 0.489, and a confidence interval from -0.0191 to +0.0103. Should a wind investor say 'Campinas winds are dropping'?",
          analyst:
            "Critical check: Campinas WS2M returns slope = -0.0042 m/s/dec, p = 0.489, and 95% CI [-0.0191, +0.0103]. Why must we reject claims of a wind trend?",
          specialist:
            "Critical unassisted limit check on Campinas WS2M (tau = -0.021, p = 0.489, 95% CI [-0.0191, 0.0103]):",
        },
        options: [
          "Reject the claim: p = 0.489 far exceeds 0.05 and the 95% CI spans zero (from negative to positive), so it is statistically indistinguishable from no trend.",
          "Accept the claim cautiously because the median point slope carries a minus sign.",
          "Accept it only if multiplied by 4.2 decades.",
          "Re-run OLS regression until p drops below 0.05.",
        ],
        correctIndex: 0,
        hint: "If zero sits comfortably inside [-0.0191, +0.0103], both slight decline and slight increase are equally plausible.",
        explain:
          "Honest science embraces null findings: Campinas WS2M (p = 0.489, CI [-0.0191, +0.0103]), Petrolina WS2M (p = 0.1734), and Manaus WS2M (p = 0.4512) all fail significance.",
      },
      {
        id: "m5-q2",
        critical: true,
        seriesRef: { region: "campinas", variable: "WS2M" },
        cockpitLink: { tab: "sources", region: "campinas", variable: "WS2M", label: "Data Scope & Roadmap" },
        cacheCheck: {
          region: "campinas",
          variable: "WS2M",
          asserts: {
            significant_5pct: false,
            p_value: 0.489,
          },
        },
        promptByDepth: {
          explorer:
            "Critical check: Grid operators fight the 'Duck Curve' (steep evening power ramps). Can our current monthly 2m NASA POWER wind dataset predict 15-minute wind ramps or battery dispatch?",
          analyst:
            "Critical scope check: Can Cockpit-OMNI's current monthly 2m wind data (WS2M, p >= 0.17 across all biomes) forecast sub-hourly grid duck-curve ramps or BESS dispatch?",
          specialist:
            "Critical boundary assessment: Why is monthly MERRA-2 WS2M explicitly out of scope for forecasting grid duck-curve wind ramps (CIU-05)?",
        },
        options: [
          "No — monthly 2m averages smooth out sub-hourly ramps, turbine hub heights are 80-120m (not 2m), and WS2M shows no multi-decade trend (p = 0.489). Hourly/GOES data is needed (roadmap).",
          "Yes — multiplying monthly WS2M by 0.409 converts it directly into 15-minute BESS curves.",
          "Yes — as long as DONKI geomagnetic storms stay below Kp 5.",
          "Only during December months after deseasonalizing.",
        ],
        correctIndex: 0,
        hint: "Check both time resolution (monthly vs. 15-minute), height (2m vs. hub height), and the null p = 0.489 result.",
        explain:
          "Stating scope boundaries is a core Space Apps value: monthly 2m POWER series diagnose 42-year climate drift, whereas operational wind-ramp forecasting requires hourly GOES/hub-height telemetry (explicitly marked Roadmap).",
      },
      {
        id: "m5-q3",
        critical: false,
        cockpitLink: { tab: "sources", region: "campinas", variable: "T2M", label: "CMR Catalog Citations" },
        cacheCheck: {
          region: "manaus",
          variable: "WS2M",
          asserts: {
            significant_5pct: false,
            p_value: 0.4512,
          },
        },
        promptByDepth: {
          explorer:
            "In our Sources tab, NASA Earthdata CMR lists NISAR and ECOSTRESS alongside POWER and FIRMS. Why does Cockpit label NISAR and ECOSTRESS 'Roadmap / Cataloged' instead of showing fake charts?",
          analyst:
            "Cockpit cites NASA Earthdata CMR collections (C3264430167-LANCEMODIS, NISAR_L2_GUNW_PROVISIONAL_V1). How should uningested collections be tagged?",
          specialist:
            "How does Cockpit-OMNI distinguish live/frozen ingested NASA series from Earthdata CMR discovery citations such as NISAR_L2_GUNW_PROVISIONAL_V1?",
        },
        options: [
          "Explicitly labeled as 'Roadmap / Cataloged via CMR MCP' — never plotted with simulated numbers or mislabeled as live.",
          "Interpolated silently from neighboring temperature pixels so the tab looks full.",
          "Hidden from Sources altogether until NISAR turns 10 years old.",
          "Renamed as MERRA-2 temperature inside the CSV download.",
        ],
        correctIndex: 0,
        hint: "Never simulate telemetry when an instrument isn't wired into the calculation pipeline yet.",
        explain:
          "Citing provenance truthfully (live, frozen-snapshot, or catalog-roadmap) protects scientific trust and helps judges verify exactly what runs today.",
      },
      {
        id: "m5-q4",
        critical: false,
        cockpitLink: { tab: "live", region: "campinas", variable: "T2M", label: "Offline Snapshot Honesty" },
        cacheCheck: {
          region: "petrolina",
          variable: "WS2M",
          asserts: {
            significant_5pct: false,
            p_value: 0.1734,
          },
        },
        promptByDepth: {
          explorer:
            "When you open Cockpit without a backend server running, why does the status bar say 'Showing frozen snapshot — 2026-11-14 15:04 UTC' instead of 'Live from NASA'?",
          analyst:
            "Why does Cockpit display an amber frozen-snapshot banner when /healthz is unreachable and provide a separate 'Verify against NASA now' button?",
          specialist:
            "Explain the observability pattern enforced by probeBackend() in CockpitPage vs. transparent static snapshot fallback:",
        },
        options: [
          "To tell the exact truth about data freshness: cached JSON runs in milliseconds offline, while live NASA verification requires an active FastAPI backend.",
          "Because amber banners load faster in browsers than green banners.",
          "To hide the FIRMS map when no API key is pasted in localStorage.",
          "Because Vercel forbids static sites from reading JSON files.",
        ],
        correctIndex: 0,
        hint: "Rule #1: never tell the user data came live from NASA today if it was actually served from a static cache file.",
        explain:
          "API keys (FIRMS_MAP_KEY, GROQ_API_KEY) remain strictly on the server. When offline or static-hosted, Cockpit tells the user honestly that the verified 2026-11-14 snapshot is active.",
      },
      {
        id: "m5-q5",
        critical: false,
        cockpitLink: { tab: "sources", region: "campinas", variable: "T2M", label: "Privacy & Device Scope" },
        cacheCheck: {
          region: "campinas",
          variable: "WS2M",
          asserts: {
            significant_5pct: false,
          },
        },
        promptByDepth: {
          explorer:
            "Academy requires zero login and saves your name, stars, and Hall of Fame in your browser's localStorage. What should the scoreboard honestly call itself?",
          analyst:
            "Why is Academy's Hall of Fame explicitly captioned 'This device only — no account, no tracking' instead of claiming 'Global Leaderboard'?",
          specialist:
            "Identify the honest privacy and storage guarantee of cockpit-omni/detective/v1 in Academy:",
        },
        options: [
          "'This device only — no account, no tracking', paired with a one-click 'Forget me' wipe button.",
          "'Synced worldwide across NASA servers using browser cookies.'",
          "'Permanent blockchain record that cannot be cleared locally.'",
          "'Ranked globally against all Space Apps teams via third-party trackers.'",
        ],
        correctIndex: 0,
        hint: "localStorage stays inside this single browser on this device — zero server accounts.",
        explain:
          "Stating 'this device only — no account, no tracking' and giving every visitor a one-click 'Forget me' button reflects honest engineering over illusory global leaderboards.",
      },
    ],
  },
];

export function getModuleById(id) {
  return MODULES.find((m) => m.id === id) || MODULES[0];
}
