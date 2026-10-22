import { z } from "zod";

// Project Form Schema
export const createProjectSchema = (t: (key: any) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(3, { message: t("projectNameValidation") })
      .max(80, { message: t("projectNameValidation") }),
    description: z
      .string()
      .max(1000, { message: t("projectDescPlaceholder") }),
  });

export type ProjectFormData = z.infer<ReturnType<typeof createProjectSchema>>;

// Task Form Schema
export const createTaskSchema = (t: (key: any) => string) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(3, { message: t("taskTitleValidation") })
      .max(120, { message: t("taskTitleValidation") }),
    description: z
      .string()
      .max(1000, { message: t("taskDescPlaceholder") }),
    status: z.enum(["todo", "in_progress", "done"]),
    priority: z.enum(["low", "medium", "high"]),
    assigneeId: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    projectId: z.string().optional(),
  });

export type TaskFormData = z.infer<ReturnType<typeof createTaskSchema>>;

// Add Member Schema
export const createAddMemberSchema = (t: (key: any) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, { message: t("emailRequired") })
      .email({ message: t("emailInvalid") }),
  });

export type AddMemberFormData = z.infer<ReturnType<typeof createAddMemberSchema>>;

// Auth Schemas
export const createLoginSchema = (t: (key: any) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, { message: t("emailRequired") })
      .email({ message: t("emailInvalid") }),
    password: z
      .string()
      .min(1, { message: t("passwordRequired") })
      .min(6, { message: t("passwordLength") }),
  });

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

export const createRegisterSchema = (t: (key: any) => string) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { message: t("nameRequired") })
        .min(2, { message: t("nameRequired") }),
      email: z
        .string()
        .trim()
        .min(1, { message: t("emailRequired") })
        .email({ message: t("emailInvalid") }),
      password: z
        .string()
        .min(1, { message: t("passwordRequired") })
        .min(6, { message: t("passwordLength") }),
      confirmPassword: z
        .string()
        .min(1, { message: t("passwordRequired") }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsMismatch"),
      path: ["confirmPassword"],
    });

export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

export const createForgotSchema = (t: (key: any) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, { message: t("emailRequired") })
      .email({ message: t("emailInvalid") }),
  });

export type ForgotFormData = z.infer<ReturnType<typeof createForgotSchema>>;
