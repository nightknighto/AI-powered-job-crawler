/** Configuration for an Ollama model used in the evaluation pipeline. */
export interface ModelConfig {
    /** Ollama model tag (e.g. `'qwen-reason'`). */
    model: string;
    /** Sampling temperature. */
    temperature: number;
    /** Whether to enable Ollama's thinking/reasoning mode. */
    think: boolean;
}

/** Pre-configured model variants keyed by camelCase identifier. */
export const modelConfigs = {
    qwenReason: {
        model: "qwen-reason",
        temperature: 0.2,
        think: false,
    },
    qwenSmall: {
        model: "qwen-small",
        temperature: 0.2,
        think: false,
    },
    gemmaE4b: {
        model: "gemma4:e4b",
        temperature: 0.2,
        think: false,
    },
    gemmaE4bThinking: {
        model: "gemma4:e4b",
        temperature: 0.2,
        think: true,
    },
} as const satisfies Record<string, ModelConfig>;

/** Union of all configured model keys (e.g. `'qwenReason' | 'qwenSmall' | 'gemmaE4b'`). */
export type ModelConfigKey = keyof typeof modelConfigs;

/** Shared settings used across the pipeline (keep-alive, display colors, etc.). */
export const shared = {
    keepAlive: "10m",
    display: {
        headingColor: "\x1b[94m\x1b[1m", // blueBright.bold
    },
} as const;
