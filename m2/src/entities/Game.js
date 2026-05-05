import { EntitySchema } from '@mikro-orm/core';
 
export const Game = new EntitySchema({
  name: 'Game',
  properties: {
    id: { primary: true, type: 'string' },
    name: { type: 'string', length: 1024 },
    namespace: { type: 'string', length: 255, nullable: true },
    lastModified: { type: 'number', nullable: true },
    description: { type: 'text', nullable: true },
    headerImage: { type: 'string', length: 2048, nullable: true },
    developer: { type: 'string', length: 512, nullable: true },
    publisher: { type: 'string', length: 512, nullable: true },
    originalPrice: { type: 'number', nullable: true },
    discountPrice: { type: 'number', nullable: true },
    currencyCode: { type: 'string', length: 16, nullable: true },
    priceFormatted: { type: 'string', length: 64, nullable: true },
    discountPriceFormatted: { type: 'string', length: 64, nullable: true },
  },
});