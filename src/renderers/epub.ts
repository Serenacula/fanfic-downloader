import type { FicData, FicImage } from "../shared/types.js"
import type { Settings, RendererFn } from "../shared/settings.js"
import { renderStoryInfoHtml } from "./story-info.js"
import { generateCoverImage } from "./cover.js"
import { fetchCoverImage } from "./utils.js"
import { strToU8, zip as fflateZip } from "fflate"

function escXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

// XHTML requires self-closing void elements and no HTML named entities beyond the XML set
function toXhtml(html: string): string {
    return html
        .replace(/&nbsp;/g, "&#160;")
        .replace(/<(br|hr)(\s[^>]*)?\s*\/?>/gi, "<$1/>")
        .replace(
            /<img(\s[^>]*?)?\s*\/?>/gi,
            (_, attrs: string | undefined) =>
                `<img${(attrs ?? "").replace(/\s*\/$/, "")}/>`,
        )
}

function xhtmlPage(title: string, body: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escXml(title)}</title>
</head>
<body>
${body}
</body>
</html>`
}

function containerXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
}

function contentOpf(
    data: FicData,
    spineItems: Array<{
        id: string
        href: string
        mediaType: string
        properties?: string
    }>,
    hasCover: boolean,
): string {
    const now = new Date().toISOString().slice(0, 10)
    const manifestItems = spineItems
        .map((item) => {
            const propsAttr = item.properties
                ? ` properties="${item.properties}"`
                : ""
            return `    <item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"${propsAttr}/>`
        })
        .join("\n")
    const spineRefs = spineItems
        .filter((item) => item.mediaType === "application/xhtml+xml")
        .map((item) => `    <itemref idref="${item.id}"/>`)
        .join("\n")

    const coverMeta = hasCover
        ? `  <meta name="cover" content="cover-image"/>\n`
        : ""

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escXml(data.core.title)}</dc:title>
    <dc:creator>${escXml(data.core.author)}</dc:creator>
    <dc:identifier id="book-id">${escXml(data.core.sourceUrl)}</dc:identifier>
    <dc:language>en</dc:language>
    <dc:date>${now}</dc:date>
    <meta name="generator" content="Sere&#x27;s Fanfic Downloader (https://github.com/Serenacula/fanfic-downloader)"/>
    ${coverMeta}
  </metadata>
  <manifest>
${manifestItems}
  </manifest>
  <spine>
${spineRefs}
  </spine>
</package>`
}

function navXhtml(data: FicData, chapterHrefs: string[]): string {
    const tocItems = [
        ...data.core.chapters.map((chapter, index) => {
            const title = chapter.title ?? `Chapter ${chapter.index + 1}`
            return `<li><a href="${chapterHrefs[index]}">${escXml(title)}</a></li>`
        }),
    ].filter(Boolean)

    return xhtmlPage(
        data.core.title,
        `<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc">
  <h1>Table of Contents</h1>
  <ol>
    ${tocItems.join("\n    ")}
  </ol>
</nav>`,
    )
}

async function blobToU8(blob: Blob): Promise<Uint8Array> {
    const buffer = await blob.arrayBuffer()
    return new Uint8Array(buffer)
}

export const renderEpub: RendererFn = async (data, settings) => {
    const files: Record<string, Uint8Array | string> = {}

    // Required: mimetype (must be first and uncompressed — handled by fflate level 0)
    files["mimetype"] = "application/epub+zip"
    files["META-INF/container.xml"] = containerXml()

    const spineItems: Array<{
        id: string
        href: string
        mediaType: string
        properties?: string
    }> = []

    // Cover image
    if (settings.includeCoverImage) {
        const fetched = await fetchCoverImage(data.core.coverImageUrl)
        let coverData: Uint8Array
        let coverExtension: string
        let coverMediaType: string

        if (fetched) {
            coverData = fetched.data
            coverExtension = fetched.extension
            coverMediaType =
                fetched.extension === "jpg"
                    ? "image/jpeg"
                    : `image/${fetched.extension}`
        } else {
            const blob = await generateCoverImage(
                data.core.title,
                data.core.author,
            )
            coverData = await blobToU8(blob)
            coverExtension = "png"
            coverMediaType = "image/png"
        }

        const coverFilename = `cover.${coverExtension}`
        files[`OEBPS/${coverFilename}`] = coverData
        files["OEBPS/cover.xhtml"] = xhtmlPage(
            "Cover",
            `<div><img src="${coverFilename}" alt="Cover" style="max-width:100%;"/></div>`,
        )
        spineItems.push({
            id: "cover-image",
            href: coverFilename,
            mediaType: coverMediaType,
            properties: "cover-image",
        })
        spineItems.push({
            id: "cover",
            href: "cover.xhtml",
            mediaType: "application/xhtml+xml",
        })
    }

    // Story info page
    const hasInfo = settings.includeCoverPage
    if (hasInfo) {
        files["OEBPS/info.xhtml"] = xhtmlPage(
            "Story Information",
            toXhtml(renderStoryInfoHtml(data, settings)),
        )
        spineItems.push({
            id: "info",
            href: "info.xhtml",
            mediaType: "application/xhtml+xml",
        })
    }

    // TOC navigation
    const chapterHrefs = data.core.chapters.map(
        (chapter) => `chapter-${chapter.index}.xhtml`,
    )

    if (settings.includeToc) {
        files["OEBPS/nav.xhtml"] = navXhtml(data, chapterHrefs)
        spineItems.push({
            id: "nav",
            href: "nav.xhtml",
            mediaType: "application/xhtml+xml",
            properties: "nav",
        })
    }

    // Embedded images — embed whatever was fetched (controlled by settings.includeImages at parse time)
    const imageMap = new Map<string, string>() // original URL → epub path
    for (const [index, image] of data.core.images.entries()) {
        const rawExt =
            image.mimeType === "image/jpeg"
                ? "jpg"
                : (image.mimeType.split("/")[1] ?? "")
        const extension =
            rawExt.replace(/\+.*$/, "").replace(/[^a-zA-Z0-9]/g, "") || "jpg"
        const path = `OEBPS/images/img-${index}.${extension}`
        files[path] = new Uint8Array(image.data)
        imageMap.set(image.url, `images/img-${index}.${extension}`)
        spineItems.push({
            id: `img-${index}`,
            href: path.replace("OEBPS/", ""),
            mediaType: image.mimeType,
        })
    }

    // Chapters
    for (const chapter of data.core.chapters) {
        let html = chapter.htmlContent
        // Remap image URLs to local epub paths
        for (const [originalUrl, localPath] of imageMap) {
            html = html.split(escXml(originalUrl)).join(localPath)
        }

        const titleHtml =
            settings.includeChapterTitles && chapter.title
                ? `<h2>Chapter ${chapter.index + 1}: ${escXml(chapter.title)}</h2>\n`
                : ""

        const href = `chapter-${chapter.index}.xhtml`
        files[`OEBPS/${href}`] = xhtmlPage(
            chapter.title ?? `Chapter ${chapter.index + 1}`,
            titleHtml + toXhtml(html),
        )
        spineItems.push({
            id: `chapter-${chapter.index}`,
            href,
            mediaType: "application/xhtml+xml",
        })
    }

    files["OEBPS/content.opf"] = contentOpf(
        data,
        spineItems,
        settings.includeCoverImage,
    )

    return new Promise((resolve, reject) => {
        const input: Record<string, [Uint8Array, { level: 0 | 9 }]> = {}
        for (const [path, content] of Object.entries(files)) {
            const bytes =
                typeof content === "string" ? strToU8(content) : content
            // mimetype must be uncompressed per ePub spec
            input[path] = [bytes, { level: path === "mimetype" ? 0 : 9 }]
        }
        fflateZip(input, (error, data_) => {
            if (error) reject(error)
            else
                resolve(
                    new Blob([data_.buffer as ArrayBuffer], {
                        type: "application/epub+zip",
                    }),
                )
        })
    })
}
