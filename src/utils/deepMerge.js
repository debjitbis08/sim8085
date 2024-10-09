export function deepMerge(target, source) {
  const output = structuredClone(target); // Deep clone the target to avoid mutation
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!output[key]) {
        output[key] = {};
      }
      deepMerge(output[key], source[key]); // Recursively merge
    } else {
      output[key] = source[key];
    }
  }
  return output;
}
