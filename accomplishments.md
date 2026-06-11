- Reduced LLM filter inference time by 55% and output tokens by 54% by refactoring the structured output to return only deduced fields, merging original job data in code via URL-based lookup
- Split monolithic LLM job evaluation into separate filter and report stages, enabling objective quality benchmarking, improved system reliability, and faster iteration through stage isolation.
- Refactored report stage from monolithic LLM to hybrid approach: code-driven tables for instant, deterministic output plus LLM summaries only for passing jobs, reducing latency, costs, and output variance.
- Implemented a systematic testing discipline with a 42-entry golden dataset (real + synthetic edge cases) and automated benchmarking to objectively measure filter accuracy, catch regressions, and validate prompt or model changes.
- Built a composable reporter system with 5 output formats (cli-table, cli-card, cli-summary, HTML, markdown), cleanly decoupling LLM summary generation from rendering so reporters can be composed freely.

