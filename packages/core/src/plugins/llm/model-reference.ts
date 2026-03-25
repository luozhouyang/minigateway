export interface ParsedLlmModelReference {
  providerName: string;
  modelName: string;
}

export function parseLlmModelReference(
  value: string | null | undefined,
): ParsedLlmModelReference | { error: string } {
  if (!value) {
    return {
      error: 'LLM requests must include a "model" field in the format "@provider/model"',
    };
  }

  if (!value.startsWith("@")) {
    return {
      error: `Invalid model "${value}". Expected format "@provider/model"`,
    };
  }

  const separatorIndex = value.indexOf("/");
  if (separatorIndex <= 1 || separatorIndex === value.length - 1) {
    return {
      error: `Invalid model "${value}". Expected format "@provider/model"`,
    };
  }

  const providerName = value.slice(1, separatorIndex).trim();
  const modelName = value.slice(separatorIndex + 1).trim();

  if (!providerName || !modelName) {
    return {
      error: `Invalid model "${value}". Expected format "@provider/model"`,
    };
  }

  return {
    providerName,
    modelName,
  };
}
