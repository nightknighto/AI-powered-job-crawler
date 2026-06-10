import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";

// @ts-ignore marked-terminal types are incompatible with marked v12
marked.use(markedTerminal({
    strong: chalk.blueBright.bold,
}));

/** Renders thinking and answer text as formatted terminal markdown.
 * @param thinking - The LLM's thinking/reasoning text (may be empty).
 * @param answer - The final markdown answer to display.
 */
export function display(thinking: string, answer: string): void {
    console.log("\n------------Thinking-----------\n", marked.parse(thinking || ''));
    console.log("\n----------Answer----------\n", marked.parse(answer));
}
