import { Router } from 'express';
import type { RequestHandler } from 'express';
import { auth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { getAuditLogsForFlag } from '../audit/audit.repository';
import { getEvalAnalytics } from '../evaluation/eval.repository';
import {
  CreateFlagSchema,
  UpdateFlagSchema,
  SetEnvironmentSchema,
} from './flag.schema';
import {
  createFlagService,
  listFlagsService,
  getFlagService,
  updateFlagService,
  deleteFlagService,
  killSwitchService,
  setEnvironmentService,
} from './flag.service';
import type { Environment } from '../../db/schema';

const router = Router();

// All flag routes require API key auth
router.use(auth as RequestHandler);

// ─── POST /api/flags ──────────────────────────────────────────────────────────
router.post(
  '/',
  validateBody(CreateFlagSchema),
  asyncHandler(async (req, res) => {
    const flag = await createFlagService(
      req.project._id,
      req.body,
      req.headers['x-api-key'] as string
    );
    res.status(201).json(flag);
  })
);

// ─── GET /api/flags ───────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const flags = await listFlagsService(req.project._id);
    res.json(flags);
  })
);

// ─── GET /api/flags/:key ──────────────────────────────────────────────────────
router.get(
  '/:key',
  asyncHandler(async (req, res) => {
    const flag = await getFlagService(req.project._id, req.params.key);
    res.json(flag);
  })
);

// ─── PATCH /api/flags/:key ────────────────────────────────────────────────────
router.patch(
  '/:key',
  validateBody(UpdateFlagSchema),
  asyncHandler(async (req, res) => {
    const flag = await updateFlagService(
      req.project._id,
      req.params.key,
      req.body,
      req.headers['x-api-key'] as string
    );
    res.json(flag);
  })
);

// ─── DELETE /api/flags/:key ───────────────────────────────────────────────────
router.delete(
  '/:key',
  asyncHandler(async (req, res) => {
    await deleteFlagService(
      req.project._id,
      req.params.key,
      req.headers['x-api-key'] as string
    );
    res.status(204).send();
  })
);

// ─── POST /api/flags/:key/kill ────────────────────────────────────────────────
router.post(
  '/:key/kill',
  asyncHandler(async (req, res) => {
    const flag = await killSwitchService(
      req.project._id,
      req.params.key,
      req.headers['x-api-key'] as string
    );
    res.json({ message: 'Kill switch activated', flag });
  })
);

// ─── PUT /api/flags/:key/environments/:env ────────────────────────────────────
router.put(
  '/:key/environments/:env',
  validateBody(SetEnvironmentSchema),
  asyncHandler(async (req, res) => {
    const env = req.params.env as Environment;
    const result = await setEnvironmentService(
      req.project._id,
      req.params.key,
      env,
      req.body,
      req.headers['x-api-key'] as string
    );
    res.json(result);
  })
);

// ─── GET /api/flags/:key/audit ────────────────────────────────────────────────
router.get(
  '/:key/audit',
  asyncHandler(async (req, res) => {
    const flag = await getFlagService(req.project._id, req.params.key);
    const logs = await getAuditLogsForFlag(flag._id);
    res.json(logs);
  })
);

// ─── GET /api/flags/:key/analytics ───────────────────────────────────────────
router.get(
  '/:key/analytics',
  asyncHandler(async (req, res) => {
    const flag = await getFlagService(req.project._id, req.params.key);
    const analytics = await getEvalAnalytics(flag._id);
    res.json(analytics);
  })
);

export default router;
