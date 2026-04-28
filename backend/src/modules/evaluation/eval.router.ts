import { Router } from 'express';
import type { RequestHandler } from 'express';
import { auth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { EvaluateSchema, BulkEvaluateSchema } from '../flags/flag.schema';
import { evaluateFlag, evaluateBulk } from './eval.service';

const router = Router();

router.use(auth as RequestHandler);

// ─── POST /api/evaluate ───────────────────────────────────────────────────────
router.post(
  '/evaluate',
  validateBody(EvaluateSchema),
  asyncHandler(async (req, res) => {
    const { flagKey, environment, user } = req.body;
    const result = await evaluateFlag(req.project._id, flagKey, environment, user);
    res.json(result);
  })
);

// ─── POST /api/evaluate/bulk ──────────────────────────────────────────────────
router.post(
  '/evaluate/bulk',
  validateBody(BulkEvaluateSchema),
  asyncHandler(async (req, res) => {
    const { environment, user } = req.body;
    const results = await evaluateBulk(req.project._id, environment, user);
    res.json(results);
  })
);

export default router;
