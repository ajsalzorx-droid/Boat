import { Fragment } from "react";
import type { SectionData } from "@/lib/content";

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
