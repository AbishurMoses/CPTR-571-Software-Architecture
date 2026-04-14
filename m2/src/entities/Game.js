import { EntitySchema } from '@mikro-orm/core';

export const Game = new EntitySchema({
  name: 'Game',
  properties: {
    id: { primary: true, type: 'string' }, // Epic uses string IDs (e.g. "fortnite")
    name: { type: 'string', length: 1024 },
    lastModified: { type: 'number', nullable: true }, // Unix timestamp
  },
});
