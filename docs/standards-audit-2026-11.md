# Scores against current standards (SCORING_VERSION 32)

Date: 2026-11-23. The Pulse web app's scores were audited against current standards (its
`docs/research/standards-audit-2026-11.md`). This note applies the same audit to the Pulse engine (`src/core/engine`),
which is what the screens show. Several web findings were already handled here, so only the gaps below changed.

## Changed

| Score | Before | Now | Standard |
|---|---|---|---|
| Recovery's HRV (`recovery.ts`, `pipeline/engine.ts`) | z in raw ms against the 60-night baseline | z in ln(RMSSD) against the nights' ln values; the screens keep the ms baseline | HRV monitoring works in ln(RMSSD) (Plews 2013, Buchheit 2014): RMSSD is right-skewed and its spread grows with its level |
| Recovery's baselines | No SD floor: a quiet month gave an SD of a few tenths, after which 1 bpm or 0.4 breaths/min swung a component from 50 to 0 or 100 | SD floored near each measure's typical error: ln HRV 0.05, resting HR 1.5 bpm, respiration 0.4 /min, skin temperature 0.1 °C; under 2 nights still neutral | Meaningful change is judged against typical error, not a raw SD (Buchheit 2014) |
| Banister TRIMP (`strain.ts`, Cardio Load) | k 0.64 for both sexes | k 0.86 with b 1.67 for women | Morton, Fitz-Clarke & Banister 1990 |
| Engine max HR (`pipeline/index.ts`) | 220 − age (the study's, restored in version 25) | Tanaka, 208 − 0.7 × age, as the rest of the app | Tanaka 2001; 220 − age overestimates younger and underestimates older adults' max HR |
| Pulse Age's missing factors (`pulseAge.ts`) | Sum scaled to nine (fix 9): the mean present factor stood in for each missing one | A missing factor counts zero, as the source did; still nothing below five factors | Scaling assumes a missing input deviates like the present ones; with no body-fat readings it inflated every other factor by 9/8 |
| Pulse Age's strength | 0 minutes on days without a strength workout, so never logging one cost about a year | Left out when the 28 days hold no strength workout | "Never logged" is not "never trained" |
| Heart-rate recovery label (`queries/activity.ts`, `hrrNote`) | The engine's 2-minute drop labelled with 1-minute cut-offs (low under 12) and described as "the first 60 seconds" | Banded on the 2-minute standard: 22 bpm or less is low (Shetler 2001); "Good" from 40 is a tunable upper band. The note says "within 2 minutes" in every language | Cole 1999's 12 bpm cut is for 1 minute |

## Already in line, unchanged

- Sleep Score drops deep and REM on unstaged nights and renormalizes; Sleep Need's age defaults are all 7 h or more
  (AASM/SRS); Sleep Bank accumulates over 7 days with a decay of e^−0.3 a night.
- Cardio Load runs on linear TRIMP with 7- and 42-day EWMAs (α 0.25 and 2/43).
- Pulse Age's references are age-typical: VO2 max at the FRIEND median, 8,000 steps (6,000 from 60).
- Fitness level uses the Cooper Institute bands (Fair 40th, Good 60th, Excellent 80th, Superior 95th).
- Health Monitor shows no SpO2 (Health Connect has none), so its 95 % floor is not reached.

## Not changed

- The FRIEND table is the 2015 one; the 2022 update's percentile table could not be read from the paper.
- Halo's older modules (`src/core/scoring`, `src/core/algorithms`) keep halo's code for the extras they feed.
