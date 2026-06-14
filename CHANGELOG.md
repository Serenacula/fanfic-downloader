## [1.1.0](https://github.com/Serenacula/fanfic-downloader/compare/v1.0.0...v1.1.0) (2026-06-14)

### Features

* add FictionPress support via shared FFN parser logic ([764fe4a](https://github.com/Serenacula/fanfic-downloader/commit/764fe4ac1876bb3f4b191e8cdb9c427e8d2335e7))
* auto-build source zip to release/ as part of npm run build ([d9c867d](https://github.com/Serenacula/fanfic-downloader/commit/d9c867dbe67398f91a1adf473ec4a035634ed222))

### Bug Fixes

* add browser-like Accept headers to HTML fetches to bypass Cloudflare bot detection ([5b6131b](https://github.com/Serenacula/fanfic-downloader/commit/5b6131bbad65218fbd7ca4601f3ddd29ce35d788))
* add browser-like Accept headers to HTML fetches to bypass Cloudflare bot detection ([b02db3d](https://github.com/Serenacula/fanfic-downloader/commit/b02db3d514082b3adb9dc31afa27c92e7135f11f))
* AO3 chapter body selector matching author notes instead of content ([36e4b91](https://github.com/Serenacula/fanfic-downloader/commit/36e4b912cb5383f88dd97ccb96019309e10314ba))
* apply bug-loop iteration-1 fixes (F-01 through F-09) ([775d546](https://github.com/Serenacula/fanfic-downloader/commit/775d5466112e7b3790b2ee0ed981065ceb4e77e3))
* clamp rateLimitMs to [0, 10000] on save (F-06) ([01e7c68](https://github.com/Serenacula/fanfic-downloader/commit/01e7c688b299b29e45d1150f8d9780c41c44aa6f))
* cross-platform xpi build using fflate instead of shell zip ([d823742](https://github.com/Serenacula/fanfic-downloader/commit/d82374213c86d1ce18befccb3313acff8de571c0))
* FFN universe selector, chapter progress status order, summary image embedding ([752ca8b](https://github.com/Serenacula/fanfic-downloader/commit/752ca8b5c0422eef335d940676660ac09e4bbe3e))
* FictionPress metadata, concurrent job storage race, request-queue drain busy-loop ([b907e81](https://github.com/Serenacula/fanfic-downloader/commit/b907e81265198f49ce5758eae3897ae380b713a7))
* guard against multiple edge-case crashes and an infinite loop (F-01, F-03, F-04, F-05, F-09) ([2f7fa64](https://github.com/Serenacula/fanfic-downloader/commit/2f7fa6457ec6a61674ab2a972e9779d0c4dbf8d9))
* inline formatting in PDF/DOCX, image src absolutisation in AO3/FFN, scoped image remapping, YAML newline escaping, FFN date label matching ([1698f12](https://github.com/Serenacula/fanfic-downloader/commit/1698f12466af66749f67438edc825126fbf490ca))
* proxy XenForo fetches through active tab to bypass Cloudflare JS challenge ([eefff28](https://github.com/Serenacula/fanfic-downloader/commit/eefff2841a42b429e24c7c6b1645b20eeea90f2e))
* request-queue drain stall, FFN summary escaping, AO3 updateDate, XenForo hostname guard, image remap dedup, misc cleanups ([769f566](https://github.com/Serenacula/fanfic-downloader/commit/769f5669c888091877664c8aa788a9f38622be3b))
* try direct fetch first, fall back to content script proxy on failure ([f66d95d](https://github.com/Serenacula/fanfic-downloader/commit/f66d95d854396deb5e697cf5730497eea50bd1e4))

## [1.0.0](https://github.com/Serenacula/fanfic-downloader/compare/3ea1e207d4aee163455edae7dfe2030be7bbb5e4...v1.0.0) (2026-05-01)

### Features

* add all format renderers (epub, html, markdown, txt, pdf, docx) ([6d36e13](https://github.com/Serenacula/fanfic-downloader/commit/6d36e131509313502ca102bddae7f060e2a0073b))
* add AO3/FFN parsers and site detection ([5498bf7](https://github.com/Serenacula/fanfic-downloader/commit/5498bf7decdbda6bf7de79450b13b2732949cbbd))
* add cover image generator and story info renderer ([2df1ce9](https://github.com/Serenacula/fanfic-downloader/commit/2df1ce94ffecd13d7ca0672dc2410261ddb8ac9d))
* add download orchestrator and URL validation ([a0dce50](https://github.com/Serenacula/fanfic-downloader/commit/a0dce5062202fd8cf94f430d1fd1ad8df13770de))
* add fic data model types and fix tsconfig ([1fdd620](https://github.com/Serenacula/fanfic-downloader/commit/1fdd620414b6469de28cdee631c2fd515e2a3984))
* add generator marker to HTML, PDF, and DOCX output ([cd4b17f](https://github.com/Serenacula/fanfic-downloader/commit/cd4b17fa61519cf9fd6a2aa4862191d75a502a4e))
* add generator meta tag to EPUB OPF metadata ([65417f3](https://github.com/Serenacula/fanfic-downloader/commit/65417f3d95b404b52f62d38ebede5ac6615843d1))
* add implementation plan and fic-downloader extension scaffold ([3ea1e20](https://github.com/Serenacula/fanfic-downloader/commit/3ea1e207d4aee163455edae7dfe2030be7bbb5e4))
* add parser tests for AO3, RoyalRoad, and Tapas ([2b17a8d](https://github.com/Serenacula/fanfic-downloader/commit/2b17a8d92b3b08b699a3b11c2350940ef18b72c5))
* add popup UI, settings page, icon badge, and page toast ([4e54294](https://github.com/Serenacula/fanfic-downloader/commit/4e54294c3f352fec5d8dfe35d697b2ba749a825f))
* add request queue with concurrency and rate limiting ([a2ded6e](https://github.com/Serenacula/fanfic-downloader/commit/a2ded6eac7d372c4cc42d327e62cb2a232cea4ee))
* add Royal Road parser ([3c1e66a](https://github.com/Serenacula/fanfic-downloader/commit/3c1e66a113b4e1c90053c538c60894e4deb0c86b)), closes [table#chapters](https://github.com/Serenacula/table/issues/chapters)
* add settings schema and storage helpers ([7b21a7e](https://github.com/Serenacula/fanfic-downloader/commit/7b21a7ebae657763375cc3bf0af1755e558f15b2))
* add Tapas, ScribbleHub, Wattpad, and XenForo forum parsers ([79587ba](https://github.com/Serenacula/fanfic-downloader/commit/79587baedeb77164fda76d34b996fe55aae5dd86))
* adding icon, updating name ([78e9039](https://github.com/Serenacula/fanfic-downloader/commit/78e9039d791e0ac90859bf3765cf2f48db4fecf4))
* enable download button on Wattpad chapter URLs ([3a39c56](https://github.com/Serenacula/fanfic-downloader/commit/3a39c5641d34a23efc687518007bf93fafa895eb))
* use og:image as cover art when available ([e0cc687](https://github.com/Serenacula/fanfic-downloader/commit/e0cc68782b648676b536ec8a36fda53e59eb1bcc))

### Bug Fixes

* bypass Cloudflare bot protection via content script fetch proxy ([44d38bd](https://github.com/Serenacula/fanfic-downloader/commit/44d38bd60a0b2b40748f159756b9141808274e07))
* correct AO3 summary selector and strip RR watermark spans ([4549285](https://github.com/Serenacula/fanfic-downloader/commit/4549285c98b1716ad8a6448bafb0dd0ed8aeec8c))
* correct RR status selector and Tapas metadata selectors from live HTML inspection ([5d47695](https://github.com/Serenacula/fanfic-downloader/commit/5d47695ba11a46a6f6706971f225ba5834d49f4d))
* correct ScribbleHub stats URL and add AJAX chapter-list fallback ([f164b81](https://github.com/Serenacula/fanfic-downloader/commit/f164b818b7274a1c9056604aad5edc8544b1e99c))
* embed images in all formats and fix EPUB Apple Books compatibility ([40498e6](https://github.com/Serenacula/fanfic-downloader/commit/40498e661a15fe397d7ee56c27617b2b773f74aa))
* fix Tapas and Wattpad parsers based on live site testing ([db99b88](https://github.com/Serenacula/fanfic-downloader/commit/db99b88ac8af62a231ae7aea28c8d40158fe305f))
* HTML-escape chapter titles and story title in HTML renderer ([4e1ab3c](https://github.com/Serenacula/fanfic-downloader/commit/4e1ab3c4104b8e0a5fddbe54dfa9e18f09920699))
* load Roboto fonts from extension bundle for PDF rendering ([0be2972](https://github.com/Serenacula/fanfic-downloader/commit/0be29727422f2ac9adfbbe7561c3357b99ace3c8))
* prevent template injection in filename formatter ([b466e72](https://github.com/Serenacula/fanfic-downloader/commit/b466e72edd7a142ee1636e653eac670bde99063b))
* replace &nbsp; with &[#160](https://github.com/Serenacula/fanfic-downloader/issues/160); in XHTML output ([853911c](https://github.com/Serenacula/fanfic-downloader/commit/853911c856fd7f508bab6679a7c50dde2d3b38ca))
* replace innerHTML job list rendering with DOM methods ([35bdbe3](https://github.com/Serenacula/fanfic-downloader/commit/35bdbe3f57e66c8dec37015b4ab06e0f67af0bac))
* restrict content script proxy to scribblehub.com URLs ([c125fd6](https://github.com/Serenacula/fanfic-downloader/commit/c125fd67abd3085e889f82010ed349246d4045e5))
* rewrite ScribbleHub parser with correct selectors and wordcount ([d6781fa](https://github.com/Serenacula/fanfic-downloader/commit/d6781fa8fb5aa2ae6b0cf8480e596dd2b61b6e68)), closes [#chp_raw](https://github.com/Serenacula/fanfic-downloader/issues/chp_raw)
* rewrite Wattpad parser using JSON-LD metadata and stable selectors ([1b83669](https://github.com/Serenacula/fanfic-downloader/commit/1b836696b263c270dc05017c461e01b87802851f))
* sanitize MIME-derived image extensions in HTML, Markdown, and EPUB renderers ([e102fb2](https://github.com/Serenacula/fanfic-downloader/commit/e102fb2e5a7f79ec215d93bdd354bb5f54b616a5))
* ScribbleHub chapter URL detection and word count selector ([37eb408](https://github.com/Serenacula/fanfic-downloader/commit/37eb4086c7a5d7f49ee0b6539b8da54f10486abd))
* send browser cookies with all fetch requests ([2baa304](https://github.com/Serenacula/fanfic-downloader/commit/2baa304cfdd5ff189c39c0daca9d6777c8bc13c7))
* strip javascript: and other dangerous href schemes in HTML sanitizer ([427d505](https://github.com/Serenacula/fanfic-downloader/commit/427d5052338267c1bf69dde49221145843ecaf01))
* ts error ([39eb537](https://github.com/Serenacula/fanfic-downloader/commit/39eb5378501b6b1a948ec475fb152b96d70214a4))
* use DOM creation for toast instead of innerHTML ([539bd46](https://github.com/Serenacula/fanfic-downloader/commit/539bd465af07ef7567efc3d0babfdd24dc0504f7))
* use full series URL (with title slug) for ScribbleHub ([a847cae](https://github.com/Serenacula/fanfic-downloader/commit/a847cae608ef3384352771385ecda47313eb91be))
* XHTML void elements, cover image in all formats ([f8686b2](https://github.com/Serenacula/fanfic-downloader/commit/f8686b2781f3a34183f1d4312758f66dd7a375fa))

### Reverts

* remove generator marker from PDF and DOCX ([4dde1dc](https://github.com/Serenacula/fanfic-downloader/commit/4dde1dc5b61c140335243dd984e2246a60772e41))
