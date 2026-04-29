import { EntitySchema } from '@mikro-orm/core';

export const Metadata = new EntitySchema({
  name: 'Metadata',
  tableName: 'metadata', 
  properties: {
    id: { 
      primary: true, 
      type: 'number', 
      autoincrement: true 
    },
    lastSyncTimestamp: { 
      type: 'number',
      fieldName: 'last_sync_timestamp' 
    },
    lastAppId: { 
      type: 'number', 
      nullable: true,
      fieldName: 'last_app_id' 
    },
    lastModified: { 
      type: 'number', 
      nullable: true,
      fieldName: 'last_modified'
    },
  },
});