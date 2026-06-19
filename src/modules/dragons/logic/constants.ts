export const DragonElements = {
  Fire: 'fire',
  Ice: 'ice',
  Lightning: 'lightning',
  Earth: 'earth',
  Water: 'water',
  Wind: 'wind',
} as const;

export type DragonElementValues = (typeof DragonElements)[keyof typeof DragonElements];

export const DRAGONS_KEY = 'dragons';
export const DRAGON_ID_COUNTER_KEY = 'dragons:id_counter';
