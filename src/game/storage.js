const read = (key, fallback) => {
  const value = localStorage.getItem(`orbi.${key}`);
  return value === null ? fallback : value;
};

export const save = (key, value) => localStorage.setItem(`orbi.${key}`, String(value));
export const numberValue = (key, fallback = 0) => Number(read(key, fallback));
export const boolValue = (key, fallback = true) => read(key, fallback ? '1' : '0') === '1';
export const maxUnlocked = (mode) => mode === 'endless' ? 1 : Math.max(1, numberValue(`unlocked.${mode}`, 1));
export const unlockNext = (mode, level) => save(`unlocked.${mode}`, Math.max(maxUnlocked(mode), level + 1));
