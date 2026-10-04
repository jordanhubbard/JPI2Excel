# JPI2Excel Project Notes

Copyright © 2025-2026 by Alan M. Marcum, Nescorna Professional.
All rights reserved.

**Revision:** 13
**Revision date:** 2026-10-03
**Project:** JPI2Excel

## Revision history

| Revision | Date | Summary |
|---|---|---|
| 13 | 2026-10-03 | Added browser workspace using Pyodide, TypeScript charts, local import/download, and recorded-limit observations; see Browser.md. |
| 12 | 2026-10-02 | Added project copyright notices and preserved the complete MIT license in upstream-derived code. |
| 11 | 2026-09-30 | Widened generated Excel windows to 36,860 twips using t4.xlsx. |
| 10 | 2026-09-30 | Copied t2 opening-window geometry; flagged flights and sensor headers at inclusive limits; refined widths and labels. |
| 9 | 2026-09-30 | Corrected conditional-format preset background fills, included equality, and pluralized count output. |
| 8 | 2026-09-30 | Added Summary-linked conditional formatting for high and low sensor limits in combined and separate workbooks. |
| 7 | 2026-09-29 | Added version 2 Excel graphs, removed Summary Input, and tracked future multi-engine graph requirements. |
| 6 | 2026-09-29 | Revised spreadsheet widths, datetime displays and oil labels; removed filters/comments and documented default output names. |
| 5 | 2026-09-29 | Allowed info alone or with one other action, including selected-flight reporting. |
| 1 | 2026-09-23 | Initial project architecture, sample-file observations, dependency strategy, validation goals, and proposed Excel output. |
| 4 | 2026-09-29 | Implemented validated legacy $L block framing; original fixtures parse with unchanged declared-flight values and counts. |
| 3 | 2026-09-28 | Recorded approved CLI/output decisions, implementation scope, fixture inclusion, and strict-validation findings. |
| 2 | 2026-09-27 | Renamed project to JPI2Excel; added findings on GPS/altitude data, twin-engine representation, alarm/limit metadata, legacy end-of-file behavior, and known gaps in the current upstream JPI-Parser implementation. |

## Approved implementation decisions (Revision 12)

`PgmSpec.txt` Revision 11 is the current CLI/output specification. It supersedes
older tentative output proposals below. Application source is in `src/jpi2excel`,
utilities in `pgms`, and regression tests in `tests`. All three original fixtures
in `testdata` are intentionally included in Git with the user's authorization.

Implemented: pinned upstream decoding, strict validation, dense reconstruction,
legacy alarms, batch CLI, CSV, combined XLSX, and separate XLSX. Combined workbooks
span all valid inputs, with Summary plus one sheet per flight. Separate workbooks
contain one flight with a hidden Summary supplying conditional-formatting limits. Duplicate flight IDs are retained with a
warning and distinct names. Existing outputs are never overwritten.

Minimum duration is in minutes (default 5); explicit short-flight selections are
errors. Sample numbering begins at 1; Delta T is elapsed seconds. Navigation columns
are last, labeled Lat/Lon/Alt/Speed. Absent channels are omitted; header-declared
channels without values stay blank with warnings. Both info and Summary include
raw metadata, source units, and per-flight derived configuration.

`--info` may run alone or alongside one other action. `--flights` filters its
per-flight details while file metadata and counts remain complete. Info may inspect
short flights; export cutoffs still apply when an export action is also requested.
All other actions remain mutually exclusive.

Current workbook formatting follows PgmSpec.txt Revision 11: no autofilters or
cell comments, seconds-only datetime display, Oil P/Oil T labels, widths assigned
by data type, and wrapped Summary values. Summary has Source, Property, Value;
the redundant Input ordinal has been removed. Flight sheets in combined and separate workbooks
use classic conditional formatting for every recorded sensor high/low limit,
referencing the source-specific Summary cells. Values at or above high limits are red and
values at or below low limits yellow; missing readings are uncolored.
Conditional-format differential styles explicitly set preset background colors.
Flight tabs are yellow when any reading is at or beyond its limit; each affected
sensor header has red text. These indicators are computed at export time.
Window width follows data/t4.xlsx (36,860 twips); height and position follow
data/t2.xlsx. These settings are encoded without a runtime file dependency.
The shared CSV/XLSX headings now use Delta T, % HP, and Mark. XLSX widths follow
PgmSpec.txt Revision 11 (Sample 50 pixels, Delta T 44, Limits 125, selected sensors 53).
See
[ConditionalFormatting.md](ConditionalFormatting.md).

Version 2.0.0 adds optional native Excel graphs via --graph/--graphs. Graph sheets
follow each selected Flight sheet, including in separate workbooks. DeltaT seconds
provide a numeric time axis. The two charts show EGT/TIT with FF and CHT/Oil T with
RPM, with source alarm lines and computed axis bounds. See [Graphing.md](Graphing.md)
for reference styling, edge cases, and the deferred multi-engine graph requirements.
This release does not change parsing or implement multi-engine decoding.

Corrupt inputs are rejected as whole files while the batch continues. The final
exit code reports bad data. Initial supported decoding is the legacy single-engine
700/800 layout with fuel code 0; future work includes multi-engine layouts even
where upstream has no support. No physical turbocharger count is inferred solely
from the number of TIT channels.

All three original fixtures now pass strict validation using the legacy framing
in JPI-Format.md Revision 4. `$L` counts physical 256-byte blocks; `$D` entries
allocate logical flight data inside them. Require the rounded block count and
`$E` at the physical end, and exclude final-block slack from flight decoding.
Info/Summary metadata expose logical and physical boundaries, block count, slack
length, and whether slack contains nonzero bytes. Tests read unmodified fixtures,
preserve the declared-flight sample/value/timestamp baselines, and reject invalid
framing and checksums. The inferred origin of the slack as stale buffer contents
does not affect this boundary rule.

## Purpose

Build a macOS-friendly tool that converts JP Instruments `.JPI` engine-monitor download files into useful Excel workbooks.

The first target is the user's legacy EDM-800 data. The design should not unnecessarily prevent later support for other JPI models, including twin-engine monitors and later formats containing GPS-derived data.

Python should do the substantive work. A shell wrapper may be added later if it improves command-line ergonomics.

## Primary dependency

The preferred starting point remains the MIT-licensed:

- `unicornlines/JPI-Parser`
- https://github.com/unicornlines/JPI-Parser

The upstream project currently identifies itself as `jpi-analyzer`, version 0.2.0, requiring Python 3.10 or newer. It exposes the equivalent console commands `jpi-analyzer` and `jpia`.

Upstream provides:

- parsing of the ASCII dollar header;
- flight discovery;
- binary flight-data decoding;
- delta/run-length reconstruction;
- sensor scaling;
- CSV export;
- a reverse-engineered `filespec.md`.

JPI2Excel should reuse the difficult binary-decoding work where it is correct, but should not treat the upstream implementation as authoritative where our source file, JPI documentation, or regression tests show otherwise.

The upstream JPI-Parser working tree is at ../JPI-Parser. Our project is this repository. Do not modify ../JPI-Parser unless I explicitly ask you to. Use it to inspect the upstream implementation and filespec.md as necessary.

## Initial source material

Current fixtures also include `U260731.JPI` (372–373) and `U260828.JPI` (393–400).

The first known sample file is:

- `U260919.JPI`

It came from a JP Instruments EDM-800 installed in a Mooney M20K 252.

The sample contains four flight-directory records:

- Flight 415
- Flight 416
- Flight 417
- Flight 418

The download header begins:

```text
$U,N2FR___*4E
$A,305,240,500,400,200,1700,220, 95*68
$F,0, 40, 35,8300,8300*58
$T, 9,19,26,20,48, 4795*60
$C, 700,63741,32689, 1556, 306*4B
$D,  415, 5509*5D
$D,  416, 7332*52
$D,  417,  210*45
$D,  418,34069*41
$L,369*5C
```

The file ends with:

```text
$E,4*5D
```

There is no `$P` record, no `$H` record, no `$V` trailer, and no trailing configuration XML in this sample.

The flight data report:

- recording interval: 2 seconds;
- rated horsepower: 208 HP.

### Preliminary independent decode

Independent inspection before JPI2Excel implementation produced these preliminary expectations:

| Flight | Start | Reconstructed samples | Approx. duration |
|---|---|---:|---:|
| 415 | 2026-09-17 18:01:58 | 724 | 24:06 |
| 416 | 2026-09-17 23:20:18 | 1,008 | 33:34 |
| 417 | 2026-09-17 23:54:20 | 33 | 1:04 |
| 418 | 2026-09-19 17:06:06 | 5,507 | 3:03:32 |

Treat these as regression candidates, not yet as unquestionable truth. They should be compared with JPI's own Windows software and the upstream parser.

## Important legacy EDM-800 observations

### Model code

The `$C` record says model `700` even though the physical unit is an EDM-800:

```text
$C, 700,...
```

Do not silently rewrite this to `800`.

The file contents are authoritative input. The model-code discrepancy may be a compatibility or firmware convention.

It also affects checksum selection in the reverse-engineered format: model 700 with software version 306 falls in the additive-checksum branch (`model 700` with software >= 296).

### Alarm/limit configuration

The sample `$A` record is:

```text
$A,305,240,500,400,200,1700,220,95*68
```

For this legacy EDM-800, JPI's alarm-programming sequence supports the following interpretation:

| Field | Sample | Meaning |
|---:|---:|---|
| 1 | 305 | High battery-voltage alarm = 30.5 V |
| 2 | 240 | Low battery-voltage alarm = 24.0 V |
| 3 | 500 | EGT differential (`DIF`) alarm = 500°F |
| 4 | 400 | High CHT alarm = 400°F |
| 5 | 200 | Cooling-rate (`CLD`) alarm magnitude = 200°F/min; display/semantic value is negative |
| 6 | 1700 | High TIT alarm = 1700°F |
| 7 | 220 | High oil-temperature alarm = 220°F |
| 8 | 95 | Low oil-temperature alarm = 95°F |

This mapping follows the programming order in the JPI EDM-700/800 Pilot's Guide and fits the values in the sample.

The current upstream JPI-Parser does **not** correctly represent this legacy `$A` layout. Its current parser assigns only selected fields and misidentifies several of them for this file. JPI2Excel therefore needs its own compatibility/normalization layer for legacy alarm metadata.

JPI documentation also shows programmable MAP-overboost and fuel-related alarms after these eight items, but those values are **not present in this sample's `$A` record**. Do not invent them.

No oil-pressure alarm threshold has been established from this sample or from the cited legacy EDM-800 alarm-programming sequence. The fact that oil pressure can be recorded as an engine parameter does not imply that an oil-pressure alarm setting is stored here.

### GPS, position, and altitude

`U260919.JPI` contains no decoded latitude, longitude, groundspeed, or altitude channels.

Do not synthesize altitude from manifold pressure or other engine parameters.

Later/protocol-2 JPI formats can expose:

- `LAT`
- `LNG`
- `SPD`
- `ALT`

and the JPI2Excel internal representation should preserve those fields when they are actually present.

### Twin-engine files

The reverse-engineered JPI format recognizes twin-engine model codes including:

- EDM-760
- EDM-790
- EDM-960

Twin-engine data are represented on a single synchronized flight timeline with distinct left/right sensor channels; they are not separate `.JPI` files or separate flights merely because two engines exist.

The JPI2Excel internal data model should therefore allow engine identity to be explicit, for example conceptually:

```text
engine L: EGT1.., CHT1.., MAP, RPM, FF, OILP, OILT, ...
engine R: EGT1.., CHT1.., MAP, RPM, FF, OILP, OILT, ...
shared:   time, OAT, electrical/GPS data as appropriate
```

Excel column names may eventually use names such as:

```text
L-EGT1
L-CHT1
L-MAP
R-EGT1
R-CHT1
R-MAP
```

The current upstream JPI-Parser is not yet a complete twin-engine decoder:

- its parser sets a twin flag for models 760 and 790 but currently omits 960;
- its metric library knows about `L`/`R` naming conventions;
- `headers_for_model(..., twin, ...)` currently does not use the `twin` argument to choose a twin sensor map.

This is a known upstream limitation to account for if/when twin support is implemented.

## Current architecture

Use JPI-Parser for the difficult binary-decoding layer, with a JPI2Excel-owned compatibility and normalization layer above it.

Recommended flow:

```text
.JPI file
   |
   v
JPI-Parser
(header + flight/binary decoding)
   |
   v
JPI2Excel compatibility/validation layer
   |-- correct legacy metadata interpretation
   |-- preserve model/firmware quirks
   |-- normalize engine identity
   |-- expose optional GPS fields
   |-- validation/warnings
   v
Normalized flight/time-series objects
   |
   v
Excel exporter
   |
   v
.xlsx
```

The compatibility layer should remain as small as practical, but it is now clearly necessary.

## Earlier proposed workbook structure (superseded by PgmSpec.txt)

Likely workbook layout:

- `Metadata`
- one worksheet per flight:
  - `Flight 415`
  - `Flight 416`
  - etc.

### Metadata sheet

Include, where available:

- source filename;
- aircraft/device identifier;
- JPI model code as recorded;
- software/firmware version;
- download timestamp;
- recording interval;
- rated horsepower;
- temperature units;
- fuel units;
- flight IDs;
- parser/JPI2Excel version;
- validation status and warnings;
- alarm/limit settings actually present in the file.

Do not imply that an absent alarm threshold is the factory default.

### Flight sheets

Columns should be driven by the decoded data, not hard-coded to the sample.

For the initial single-engine EDM-800, possible columns include:

```text
DateTime
Elapsed
E1 E2 E3 E4 E5 E6
C1 C2 C3 C4 C5 C6
T1
OAT
DIF
CLD
CDT
IAT
MAP
RPM
HP
FF
OILP
OILT
BAT
USD
MARK
```

For files that actually contain navigation data, also allow:

```text
LAT
LNG
ALT
SPD
```

For twins, use explicit left/right naming.

Use real Excel datetime cells, not preformatted strings.

Useful workbook features:

- frozen header row;
- autofilter;
- reasonable column widths;
- units clearly identified;
- appropriate number formats;
- optional validation/warning notes.

Charts are not an initial requirement.

## Validation philosophy

Engine-monitor data are operationally meaningful. Prefer explicit validation over silently accepting corrupt or ambiguously interpreted data.

Where practical:

- validate ASCII-header checksums;
- validate binary flight-header integrity;
- validate compressed data-record checksums;
- preserve warnings and validation results;
- fail visibly for unsupported formats rather than fabricating values;
- distinguish "not present" from "present but undecoded."

The reverse-engineered checksum rules vary by model/firmware/protocol.

A future interface may support:

```text
strict
warn
ignore
```

Do not implement modes until the current behavior is characterized by tests.

## Units

Do not assume all temperature channels use the same unit.

The format can distinguish engine-temperature units from OAT units.

Fuel-flow and fuel-used scaling depends on fuel-unit configuration.

The Excel layer should derive units from the file metadata or parser state rather than from generic metric-library defaults.

## Initial development milestones

1. Maintain `JPI2Excel` as its own Git repository.
2. Pin a known JPI-Parser commit as a reproducible dependency.
3. Include the three original fixtures in `testdata`, as explicitly approved by the user.
4. Run upstream `jpia info` against the sample and save the result.
5. Export all sample flights with upstream `jpia csv`.
6. Compare those results with the preliminary expectations above.
7. Compare with JPI's Windows software where possible.
8. Add regression tests for the sample.
9. Add JPI2Excel legacy-metadata normalization, beginning with `$A`.
10. Add `.xlsx` export with `openpyxl`.
11. Verify workbook values against normalized CSV/parser values.
12. Add optional navigation-field support when a suitable file is available.
13. Add twin-engine support only with at least one real twin `.JPI` fixture or authoritative comparison output.

## Dependency strategy

Keep JPI2Excel as its own repository.

Preferred initial dependency:

```text
JPI2Excel
    |
    +-- pinned Git dependency on unicornlines/JPI-Parser
```

Do not copy the upstream repository wholesale into JPI2Excel.

Reasons:

- clear ownership boundary;
- reproducible dependency;
- easier upstream comparison;
- cleaner licensing/history;
- reduced chance of accidental modification.

For source inspection, an optional sibling clone is useful:

```text
Projects/
    JPI2Excel/
    JPI-Parser/
    JPI-test-data/
```

If modifications to JPI-Parser become necessary, prefer, in order:

1. contribute a focused upstream fix if appropriate;
2. fork JPI-Parser and pin JPI2Excel to the fork;
3. vendor a specific copy only if there is a strong reason;
4. use a submodule only if the development workflow clearly benefits.

## Licensing

JPI-Parser is MIT-licensed.

If upstream code is copied or vendored, preserve the upstream copyright and MIT license notice.

If JPI-Parser is only installed as a dependency, retain attribution/documentation of the dependency.

Project-specific material carries the copyright notice and All rights reserved
statement in `COPYRIGHT`. Upstream-derived portions of `src/jpi2excel/reader.py`
retain the original MIT license, repeated in that file and `THIRD-PARTY.md`.

## Earlier open questions (layout/policy decisions resolved above)

- Exact final workbook naming/layout.
- One workbook per `.JPI` file versus other output modes.
- Whether to expose both raw JPI codes and friendly column labels.
- Whether charts or derived values should later be included.
- Exact checksum-validation policy.
- Additional legacy EDM-800 firmware variants.
- Meaning of the sample's `$C` model code `700` despite EDM-800 hardware.
- Where later legacy files store MAP/fuel alarm settings, if at all.
- Whether other EDM-800 firmware versions record GPS-derived data.
- Twin-engine channel maps and model-specific variations.
- Sanitization strategy for test fixtures containing aircraft identifiers.

## Sources

### Reverse-engineered parser/specification

- https://github.com/unicornlines/JPI-Parser
- https://github.com/unicornlines/JPI-Parser/blob/main/filespec.md
- https://github.com/unicornlines/JPI-Parser/blob/main/jpi_analyzer/parser.py
- https://github.com/unicornlines/JPI-Parser/blob/main/jpi_analyzer/metrics.py

### JPI documentation

- J.P. Instruments EDM-700/800/711 Pilot's Guide, Rev. W:
  https://www.jpinstruments.com/wp-content/uploads/2012/10/PG-EDM-800-Rev-W.pdf

## Upstream CLI examples

```bash
jpia --file data.JPI info

jpia --file data.JPI csv \
  --flights all \
  --metrics all \
  --out-dir ./out
```
