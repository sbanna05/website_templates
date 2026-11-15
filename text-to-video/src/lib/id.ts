export const createId = (prefix = 'id'): string => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
