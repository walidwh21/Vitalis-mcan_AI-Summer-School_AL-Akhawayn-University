import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "./config.ts";
import { asyncHandler, HttpError } from "./http.ts";
import { requireAuth, signToken } from "./middleware.ts";
import { createUser, findByEmail, findById, toPublicUser, updateProfile } from "./users.ts";

const locale = z.enum(["en", "fr", "ar"]);

const registerBody = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  fullName: z.string().trim().min(1).max(80),
  locale: locale.default("en"),
});

const loginBody = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

const profileBody = z
  .object({ fullName: z.string().trim().min(1).max(80).optional(), locale: locale.optional() })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field");

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", config.BCRYPT_COST);

export const router = Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerBody.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, config.BCRYPT_COST);
    const user = await createUser({ ...body, passwordHash });
    if (!user) throw new HttpError(409, "An account with this email already exists");
    res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginBody.parse(req.body);
    const user = await findByEmail(body.email);
    const ok = await bcrypt.compare(body.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, "Incorrect email or password");
    res.json({ token: signToken(user.id), user: toPublicUser(user) });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const user = await findById(res.locals.userId);
    if (!user) throw new HttpError(401, "Account no longer exists");
    res.json({ user: toPublicUser(user) });
  }),
);

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await updateProfile(res.locals.userId, profileBody.parse(req.body));
    if (!user) throw new HttpError(401, "Account no longer exists");
    res.json({ user: toPublicUser(user) });
  }),
);
