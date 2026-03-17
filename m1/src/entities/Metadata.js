import { EntitySchema } from '@mikro-orm/core';

export const Metadata = new EntitySchema({
  name: 'Metadata',
  properties: {
    id: { primary: true, type: 'number', autoincrement: true },
    lastSyncTimestamp: { type: 'number' },
    lastAppId: { type: 'number', nullable: true },
    lastModified: { type: 'number', nullable: true },
  },
});