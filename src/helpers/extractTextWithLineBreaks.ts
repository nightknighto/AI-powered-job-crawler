import { Cheerio, CheerioAPI } from "crawlee";

/** Extracts text from a Cheerio element, preserving line breaks at block-element boundaries.
 * Skips `<style>`, `<script>`, and other non-content elements.
 *
 * @param cheerio - The CheerioAPI instance (from Crawlee).
 * @param $element - The Cheerio-wrapped DOM element to extract text from.
 * @returns Cleaned text with normalized line breaks.
 */
export function extractTextWithLineBreaks(cheerio: CheerioAPI, $element: Cheerio<any>): string {
    const blockElements = new Set([
        'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'table',
        'tr', 'td', 'th', 'header', 'footer', 'section',
        'article', 'aside', 'nav', 'main', 'br', 'hr',
        'dl', 'dt', 'dd', 'figure', 'figcaption', 'form'
    ]);

    const skipElements = new Set([
        'style', 'script', 'noscript', 'iframe', 'svg', 'path',
        'link', 'meta', 'head', 'title', '!doctype'
    ]);

    const isBlock = (tagName: string | undefined) => {
        const normalizedTag = tagName?.toLowerCase();
        return normalizedTag ? blockElements.has(normalizedTag) : false;
    };

    const shouldSkip = (tagName: string | undefined) => {
        const normalizedTag = tagName?.toLowerCase();
        return normalizedTag ? skipElements.has(normalizedTag) : false;
    };

    const extractText = ($elem: any): string => {
        let result = '';

        $elem.contents().each((_: number, node: any) => {
            if (node.nodeType === 3) { // Text node
                result += cheerio(node).text();
            } else if (node.nodeType === 1) { // Element node
                const $child = cheerio(node);
                const tagName = node.tagName;

                if (shouldSkip(tagName)) {
                    return; // Skip this element entirely
                }

                if (tagName === 'br') {
                    result += '\n';
                } else {
                    if (isBlock(tagName) && result && !result.endsWith('\n')) {
                        result += '\n';
                    }
                    result += extractText($child);
                    if (isBlock(tagName) && !result.endsWith('\n')) {
                        result += '\n';
                    }
                }
            }
        });

        return result;
    };

    return extractText($element).replace(/\n{3,}/g, '\n\n').trim();
}