/**
 * Client-side PPTX generation using JSZip.
 * PPTX is a ZIP archive containing XML files.
 * This avoids node:https dependency issues with pptxgenjs in the browser.
 */

interface SlideInput {
  topic: string;
  imageBase64: string;
  showTitle: boolean;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// EMU = English Metric Units (1 inch = 914400 EMU)
const SLIDE_WIDTH = 12192000;  // 13.333 inches (widescreen 16:9)
const SLIDE_HEIGHT = 6858000;  // 7.5 inches

function contentTypesXml(slideCount: number): string {
  let slideTypes = "";
  for (let i = 1; i <= slideCount; i++) {
    slideTypes += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  }
  let imageTypes = "";
  for (let i = 1; i <= slideCount; i++) {
    imageTypes += `<Override PartName="/ppt/media/image${i}.png" ContentType="image/png"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideTypes}
  ${imageTypes}
</Types>`;
}

function relsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
}

function presentationXml(slideCount: number): string {
  let slideList = "";
  for (let i = 1; i <= slideCount; i++) {
    slideList += `<p:sldId id="${256 + i}" r:id="rId${i}"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst/>
  <p:sldIdLst>${slideList}</p:sldIdLst>
  <p:sldSz cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/>
  <p:notesSz cx="${SLIDE_HEIGHT}" cy="${SLIDE_WIDTH}"/>
</p:presentation>`;
}

function presentationRelsXml(slideCount: number): string {
  let rels = "";
  for (let i = 1; i <= slideCount; i++) {
    rels += `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
</Relationships>`;
}

function slideXml(slideIndex: number, topic: string, showTitle: boolean): string {
  const titleXml = showTitle && topic ? `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="3" name="TextBox"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="0" y="5486400"/>
          <a:ext cx="${SLIDE_WIDTH}" cy="1371600"/>
        </a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="000000"><a:alpha val="50000"/></a:srgbClr></a:solidFill>
      </p:spPr>
      <p:txBody>
        <a:bodyPr anchor="ctr" anchorCtr="0">
          <a:normAutofit/>
        </a:bodyPr>
        <a:lstStyle/>
        <a:p>
          <a:pPr algn="l"/>
          <a:r>
            <a:rPr lang="ja-JP" sz="3200" b="1" dirty="0">
              <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
              <a:latin typeface="Noto Sans JP"/>
              <a:ea typeface="Noto Sans JP"/>
            </a:rPr>
            <a:t>${escapeXml(topic)}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="2" name="Image${slideIndex}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId1"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>
      ${titleXml}
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function slideRelsXml(slideIndex: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${slideIndex}.png"/>
</Relationships>`;
}

export async function downloadPptx(slides: SlideInput[]): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Root rels
  zip.file("[Content_Types].xml", contentTypesXml(slides.length));
  zip.file("_rels/.rels", relsXml());

  // Presentation
  zip.file("ppt/presentation.xml", presentationXml(slides.length));
  zip.file("ppt/_rels/presentation.xml.rels", presentationRelsXml(slides.length));

  // Slides
  for (let i = 0; i < slides.length; i++) {
    const idx = i + 1;
    zip.file(`ppt/slides/slide${idx}.xml`, slideXml(idx, slides[i].topic, slides[i].showTitle));
    zip.file(`ppt/slides/_rels/slide${idx}.xml.rels`, slideRelsXml(idx));
    zip.file(`ppt/media/image${idx}.png`, base64ToUint8Array(slides[i].imageBase64));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "anime_presentation.pptx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
