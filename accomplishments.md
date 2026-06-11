- Split monolithic LLM job evaluation into separate filter and report stages, enabling objective quality benchmarking, improved system reliability, and faster iteration through stage isolation.
- Reduced LLM filter inference time by 55% and output tokens by 54% by refactoring the structured output to return only deduced fields, merging original job data in code via URL-based lookup
- Achieved 77% faster LLM report generation and 77% fewer output tokens by refactoring from monolithic LLM to hybrid approach: deterministic Reporter classes for tables + LLM summaries only for passing jobs. Combined with earlier filter optimization (55% faster, 54% fewer tokens), achieved ~65% average performance improvement across the full pipeline.
- Implemented a systematic testing discipline with a 42-entry golden dataset (real + synthetic edge cases) and automated benchmarking to objectively measure filter accuracy, catch regressions, and validate prompt or model changes.
- Built a composable reporter system with 5 output formats (cli-table, cli-card, cli-summary, HTML, markdown), cleanly decoupling LLM summary generation from rendering so reporters can be composed freely.

