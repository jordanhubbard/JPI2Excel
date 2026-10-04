# Third-party dependencies

Project-specific documentation:
Copyright © 2025-2026 by Alan M. Marcum, Nescorna Professional.
All rights reserved.

Revision: 4

The project notice above does not replace or restrict the upstream MIT notice
reproduced below.

- **JPI-Parser / jpi-analyzer 0.2.0**, unicornlines, MIT license.
  Source: https://github.com/unicornlines/JPI-Parser
  Pinned commit: `e1a34c37d3cc2194699faba92e6666300cb85e86`.
  License: https://github.com/unicornlines/JPI-Parser/blob/e1a34c37d3cc2194699faba92e6666300cb85e86/LICENSE
  Used for binary delta unpacking, header parsing, and metric definitions.
  `src/jpi2excel/reader.py` adapts decoder orchestration from
  `jpi_analyzer/decoder.py` and extends upstream classes with strict validation
  and legacy compatibility behavior. The adapted file repeats the complete
  upstream MIT license and identifies its pinned source revision.
  Other modules import the dependency; no complete upstream source files are vendored.
- **openpyxl 3.1.5**, MIT license. Used for XLSX generation and test verification.
  Source: https://openpyxl.readthedocs.io/

Project-owned compatibility behavior and its regression evidence are documented
in `JPI-Format.md`. The sibling JPI-Parser repository is used read-only.

## JPI-Parser MIT license

The following license applies to upstream-derived portions, including those
in `src/jpi2excel/reader.py`.

```text
MIT License

Copyright (c) 2026 Unicornlines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```


## Browser distribution

- **Pyodide 0.29.3**, MPL-2.0, runs Python in a WebAssembly worker.
  Unmodified source: https://github.com/pyodide/pyodide/tree/0.29.3
  Python runtime version: 3.13.2 (PSF license).
- **Apache ECharts 6.1.0**, Apache-2.0, and its zrender dependency implement
  interactive browser charts. Source: https://github.com/apache/echarts
- **React / React DOM 19.3.0**, MIT, implement the interface.
  Source: https://github.com/facebook/react
- **vinext 1.0.1**, MIT, and Vite provide application building/serving.
  Source: https://github.com/cloudflare/vinext

The browser preparation step copies the Python modules from the installed
pinned dependencies into a generated ZIP; this ZIP retains JPI-Parser,
openpyxl, and et-xmlfile license files. It is not committed to this repository.
Pyodide and Python license texts are retained in `web/licenses/`. Generated
`/runtime/` assets include those texts and license/notice files for ECharts,
zrender, React, React DOM, scheduler, vinext, and React Server Components.
The complete JavaScript dependency versions are locked in `web/package-lock.json`.
