import { EntitySchema } from '@mikro-orm/core';

export const Review = new EntitySchema({
  name: 'Review',
  properties: {
    id: { primary: true, type: 'number', autoincrement: true },
    gameId: { type: 'string', length: 255 },
    // IGDB ratings are fractional (0–100 with decimals). Force the column
    // type to NUMERIC so schema.update doesn't downcast back to INTEGER.
    igdbRating: { type: 'number', columnType: 'numeric', nullable: true },
    igdbRatingCount: { type: 'number', columnType: 'numeric', nullable: true },
    igdbAggregatedRating: { type: 'number', columnType: 'numeric', nullable: true },
    igdbAggregatedRatingCount: { type: 'number', columnType: 'numeric', nullable: true },
  },
});
