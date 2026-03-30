/**
 * Client-side PPTX generation using JSZip.
 * Generates a valid PPTX that Microsoft PowerPoint can open.
 * Includes required slideMaster, slideLayout, and theme.
 */

interface SlideInput {
  topic: string;
  bulletPoints: string[];
  imageBase64: string;
  showTitle: boolean;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function b64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const W = 12192000; // 16:9 width in EMU
const H = 6858000;  // 16:9 height in EMU

// ─── Required PPTX skeleton files ───

function contentTypes(n: number): string {
  const slides = Array.from({ length: n }, (_, i) =>
    `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="jpeg" ContentType="image/jpeg"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${slides}
</Types>`;
}

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

function presentationXml(n: number): string {
  const slides = Array.from({ length: n }, (_, i) =>
    `<p:sldId id="${256 + i}" r:id="rId${i + 10}"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${slides}</p:sldIdLst>
<p:sldSz cx="${W}" cy="${H}" type="custom"/>
<p:notesSz cx="${H}" cy="${W}"/>
</p:presentation>`;
}

function presentationRels(n: number): string {
  const slides = Array.from({ length: n }, (_, i) =>
    `<Relationship Id="rId${i + 10}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
${slides}
</Relationships>`;
}

const slideMasterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;

const slideMasterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const slideLayoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
</p:sldLayout>`;

const slideLayoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="AnimeTheme">
<a:themeElements>
<a:clrScheme name="AnimeColors">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="1F2937"/></a:dk2>
<a:lt2><a:srgbClr val="E5E7EB"/></a:lt2>
<a:accent1><a:srgbClr val="6366F1"/></a:accent1>
<a:accent2><a:srgbClr val="8B5CF6"/></a:accent2>
<a:accent3><a:srgbClr val="06B6D4"/></a:accent3>
<a:accent4><a:srgbClr val="F59E0B"/></a:accent4>
<a:accent5><a:srgbClr val="10B981"/></a:accent5>
<a:accent6><a:srgbClr val="EF4444"/></a:accent6>
<a:hlink><a:srgbClr val="6366F1"/></a:hlink>
<a:folHlink><a:srgbClr val="8B5CF6"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="AnimeFonts">
<a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="AnimeFormat">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;

// ─── Slide XML ───

function slideXml(idx: number, topic: string, bullets: string[], showTitle: boolean): string {
  // Header bar at top
  const headerXml = showTitle && topic ? `
<p:sp>
  <p:nvSpPr><p:cNvPr id="3" name="Header"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="1143000"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:solidFill><a:srgbClr val="000000"><a:alpha val="60000"/></a:srgbClr></a:solidFill>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  <p:txBody>
    <a:bodyPr anchor="ctr" lIns="457200" rIns="274320" tIns="0" bIns="0"/>
    <a:lstStyle/>
    <a:p>
      <a:pPr algn="l"/>
      <a:r>
        <a:rPr lang="ja-JP" sz="3600" b="1" dirty="0">
          <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          <a:latin typeface="Noto Sans JP"/><a:ea typeface="Noto Sans JP"/>
        </a:rPr>
        <a:t>${esc(topic)}</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>` : "";

  // Bullet points box at bottom-right
  let bulletsXml = "";
  if (bullets.length > 0) {
    const paras = bullets.map(bp => `
<a:p>
  <a:pPr marL="228600" indent="-228600" algn="l">
    <a:lnSpc><a:spcPct val="150000"/></a:lnSpc>
    <a:buFont typeface="Arial"/><a:buChar char="\u25CF"/>
  </a:pPr>
  <a:r>
    <a:rPr lang="ja-JP" sz="2000" dirty="0">
      <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
      <a:latin typeface="Noto Sans JP"/><a:ea typeface="Noto Sans JP"/>
    </a:rPr>
    <a:t>${esc(bp)}</a:t>
  </a:r>
</a:p>`).join("");

    bulletsXml = `
<p:sp>
  <p:nvSpPr><p:cNvPr id="4" name="Bullets"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="5943600" y="3657600"/><a:ext cx="5943600" cy="3048000"/></a:xfrm>
    <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 5000"/></a:avLst></a:prstGeom>
    <a:solidFill><a:srgbClr val="1A1A2E"><a:alpha val="75000"/></a:srgbClr></a:solidFill>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  <p:txBody>
    <a:bodyPr anchor="ctr" lIns="274320" rIns="274320" tIns="182880" bIns="182880"><a:normAutofit/></a:bodyPr>
    <a:lstStyle/>
    ${paras}
  </p:txBody>
</p:sp>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
<p:pic>
  <p:nvPicPr><p:cNvPr id="2" name="Img${idx}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
  <p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
  <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="${H}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
</p:pic>
${headerXml}
${bulletsXml}
</p:spTree></p:cSld>
</p:sld>`;
}

function slideRels(idx: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${idx}.png"/>
</Relationships>`;
}

// ─── Main export ───

export async function downloadPptx(slides: SlideInput[]): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Package structure
  zip.file("[Content_Types].xml", contentTypes(slides.length));
  zip.file("_rels/.rels", rootRels);

  // Presentation
  zip.file("ppt/presentation.xml", presentationXml(slides.length));
  zip.file("ppt/_rels/presentation.xml.rels", presentationRels(slides.length));

  // Theme (required)
  zip.file("ppt/theme/theme1.xml", themeXml);

  // Slide Master (required)
  zip.file("ppt/slideMasters/slideMaster1.xml", slideMasterXml);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", slideMasterRels);

  // Slide Layout (required)
  zip.file("ppt/slideLayouts/slideLayout1.xml", slideLayoutXml);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slideLayoutRels);

  // Slides + images
  for (let i = 0; i < slides.length; i++) {
    const idx = i + 1;
    const s = slides[i];
    zip.file(`ppt/slides/slide${idx}.xml`, slideXml(idx, s.topic, s.bulletPoints, s.showTitle));
    zip.file(`ppt/slides/_rels/slide${idx}.xml.rels`, slideRels(idx));
    zip.file(`ppt/media/image${idx}.png`, b64ToBytes(s.imageBase64));
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
