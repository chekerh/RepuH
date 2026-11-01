import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Enter your email address.")
  .max(254)
  .email("That doesn't look like an email address.");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2, "Tell us what to call you.").max(80),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lowercase letters, numbers, hyphen or underscore."),
  headline: z.string().trim().max(120).optional().default(""),
  bio: z.string().trim().max(600).optional().default(""),
  country: z.string().trim().max(60).optional().default(""),
  specialization: z.string().trim().max(80).optional().default(""),
  profession: z.literal("software-engineer").default("software-engineer"),
  visibility: z.enum(["private", "public", "selective"]).default("private"),
  leaderboardOptIn: z.boolean().default(false),
  connectGithub: z.boolean().default(false),
  useDemoData: z.boolean().default(false),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(600).optional(),
  country: z.string().trim().max(60).optional(),
  specialization: z.string().trim().max(80).optional(),
  visibility: z.enum(["private", "public", "selective"]).optional(),
});

export const visibilitySchema = z.object({
  visibility: z.enum(["private", "public", "selective"]),
});

export const consentSchema = z.object({
  purpose: z.enum(["github_observation", "browser_observation", "ai_classification"]),
  granted: z.boolean(),
  scope: z.string().trim().max(300).optional(),
});

export const extensionEventSchema = z.object({
  events: z
    .array(
      z.object({
        externalId: z.string().min(1).max(200),
        eventType: z.literal("website_session_observed"),
        occurredAt: z.string().datetime(),
        domain: z.string().min(1).max(200),
        title: z.string().max(200).optional(),
        durationSeconds: z.number().min(0).max(86_400).optional(),
      }),
    )
    .min(1)
    .max(50),
});

export const blockchainVerifySchema = z.object({
  batchId: z.number().int().positive(),
  commitment: z.string().min(64).max(64),
});
