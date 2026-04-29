import { EntitySchema } from '@mikro-orm/core';

export const Review = new EntitySchema({
  name: 'Review',
  properties: {
    gameId: {
      primary: true,
      type: 'number',
      autoincrement: false,
      fieldName: 'game_id',
    },
    title: { type: 'string', length: 1024 },
    totalReviews: { type: 'number', fieldName: 'total_reviews' },
    market: { type: 'string', length: 32, default: 'steam' },
    positiveReviews: { type: 'number', fieldName: 'positive_reviews' },
  },
});
