/**
 * The one place structured data turns into markup.
 *
 * Deliberately split from lib/jsonld.ts: that module is pure data, so it can be
 * imported by a route, a test, or pasted into a validator without dragging React
 * along, and this file is the only thing in the codebase that knows how a
 * <script type="application/ld+json"> is spelled. Everything that wants JSON-LD
 * renders <JsonLd data={...} /> and inherits the escaping below instead of each
 * caller re-deriving it and one of them getting it wrong.
 *
 * Server component on purpose (no "use client"): the graph is static per build,
 * so shipping it as HTML costs a crawler nothing and costs a browser no JS.
 */

export default function JsonLd({ data }: { data: object }) {
  /* Serialize, then neutralize every "<".
     The content of a <script> element is *raw text*: the HTML tokenizer stops
     looking for elements or entities and scans for the literal "</script".
     So one paper title or project blurb containing "</script>" would close the
     tag early and spill the rest of the JSON into the document as markup. The
     mirror-image hazard is "<!--", which pushes the tokenizer into the
     script-data-escaped state where a later "</script>" no longer closes the
     tag and the rest of the page gets swallowed. Replacing every "<" covers
     both without trying to pattern-match either.
     This is lossless: < is a JSON string escape, so JSON.parse hands a
     consumer back the identical "<". And it cannot corrupt the document,
     because JSON.stringify only ever emits "<" inside string values, never as
     structure. The data modules are hand-edited prose; treat them as untrusted
     the same way you would treat a form field. */
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  /* Rejected: also escaping U+2028/U+2029. That is required when JSON is
     embedded in a JavaScript *program* (both were illegal inside string
     literals before ES2019); the body here is parsed as JSON, where they have
     always been legal characters.
     dangerouslySetInnerHTML rather than <script>{json}</script>, because React
     escapes text children into HTML entities and raw-text elements never decode
     entities back — a consumer would be handed &quot; and fail to parse. innerHTML
     is the only way to get literal JSON into the tag, which is precisely why the
     escaping above is load-bearing and not a nicety. */
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
