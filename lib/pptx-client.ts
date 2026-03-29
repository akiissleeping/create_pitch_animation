interface SlideInput {
  topic: string;
  imageBase64: string;
  showTitle: boolean;
}

export async function downloadPptx(slides: SlideInput[]): Promise<void> {
  // Dynamic import to avoid SSR/webpack issues with node: modules
  const PptxGenJS = (await import("pptxgenjs")).default;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 16:9

  for (const slide of slides) {
    const s = pptx.addSlide();

    // Full-bleed background image
    s.addImage({
      data: `image/png;base64,${slide.imageBase64}`,
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
      sizing: { type: "cover", w: "100%", h: "100%" },
    });

    // Optional title overlay
    if (slide.showTitle && slide.topic) {
      s.addShape("rect", {
        x: 0,
        y: 5.4,
        w: "100%",
        h: 1.1,
        fill: { color: "000000", transparency: 50 },
        line: { color: "000000", transparency: 100 },
      });

      s.addText(slide.topic, {
        x: 0.5,
        y: 5.45,
        w: 12.3,
        h: 1.0,
        fontSize: 32,
        fontFace: "Noto Sans JP",
        color: "FFFFFF",
        bold: true,
        valign: "middle",
      });
    }
  }

  await pptx.writeFile({ fileName: "anime_presentation.pptx" });
}
