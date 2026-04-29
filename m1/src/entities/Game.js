import { EntitySchema } from '@mikro-orm/core';

export const Game = new EntitySchema({
  name: 'Game',
  properties: {
    appId: { 
      primary: true, 
      type: 'number', 
      autoincrement: false, 
      fieldName: 'app_id'   
    },
    name: { type: 'string', length: 1024 },
    lastModified: { 
      type: 'number', 
      nullable: true,
      fieldName: 'last_modified' 
    },
  },
});