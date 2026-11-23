import { Fragment, type ReactNode } from "react";
import type { SectionData } from "@/lib/content";
import { HEADING_FONT_SIZES, parseHeadingStyle, type HeadingTag } from "@/lib/heading-style";

// Text from the SEO Studio (/seo): each new line becomes a <br />
export function Lines({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}

// A heading whose tag (H1–H6, P) and font size can be changed in the SEO Studio. `as` = the design's
// own tag, `choice` = the saved choice (field "<heading>_style"); empty keeps the design.
export function StyledHeading({
  as,
  choice,
  id,
  className,
  children,
}: {
  as: HeadingTag | "blockquote";
  choice: string | undefined;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const { tag, size } = parseHeadingStyle(choice);
  const Tag = tag || as;
  return (
    <Tag id={id} className={className} style={size ? { fontSize: HEADING_FONT_SIZES[size] } : undefined}>
      {children}
    </Tag>
  );
}

// "Heading" + "Highlighted words" fields; the highlight goes on a new line when the heading ends with one
export function Heading({ c, emClassName }: { c: SectionData; emClassName: string }) {
  const { title = "", highlight = "" } = c.fields;
  return (
    <>
      <Lines text={title} />
      {highlight && (
        <>
          {title.endsWith("\n") ? null : " "}
          <em className={emClassName}>{highlight}</em>
        </>
      )}
    </>
  );
}
