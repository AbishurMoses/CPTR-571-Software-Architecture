import { EntitySchema } from '@mikro-orm/core';

export const Review = new EntitySchema({
  name: 'Review',
  properties: {
    id: { primary: true, type: 'number', autoincrement: true },
    gameId: { type: 'string', length: 255 },
    igdbRating: { type: 'number', nullable: true },              // user rating 0-100
    igdbRatingCount: { type: 'number', nullable: true },
    igdbAggregatedRating: { type: 'number', nullable: true },    // critic rating 0-100
    igdbAggregatedRatingCount: { type: 'number', nullable: true },
  },
});