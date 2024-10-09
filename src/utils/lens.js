export function createLens(path) {
  return {
    get: (obj) => path.reduce((acc, key) => acc[key], obj),  // Dynamically traverse the path for the getter
    set: (obj, value) => {
      // Traverse to the second-last key
      const lastKey = path.pop();
      const target = path.reduce((acc, key) => acc[key], obj);
      target[lastKey] = value;  // Set the value at the last key
    }
  };
}
