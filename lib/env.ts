export const readEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value || undefined;
};

export const requireEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};
