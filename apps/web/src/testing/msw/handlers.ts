import { rest } from 'msw';

import { buildMockPublicTargetSummary } from './factories/public-target-summary';

/**
 * Role: Declares the web-test MSW handlers used by baseline generated-client tests.
 * Boundary: Testing boundary only. Production runtime code must not depend on these handlers.
 * Ref: #179
 */
export const handlers = [
  rest.get('*/v1/public/targets/:targetId/summary', (req, res, ctx) => {
    const targetId = String(req.params.targetId ?? 'baseline-target');

    return res(ctx.status(200), ctx.json(buildMockPublicTargetSummary(targetId)));
  }),
];
