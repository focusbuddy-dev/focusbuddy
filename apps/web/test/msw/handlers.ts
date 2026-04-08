import { rest } from 'msw';

import { buildExamplePublicTargetSummary } from '../../src/lib/api/example-public-target-summary';

export const handlers = [
  rest.get('http://localhost:3000/v1/public/targets/:targetId/summary', (req, res, ctx) => {
    const targetId = String(req.params.targetId ?? 'baseline-target');

    return res(ctx.status(200), ctx.json(buildExamplePublicTargetSummary(targetId)));
  }),
];
