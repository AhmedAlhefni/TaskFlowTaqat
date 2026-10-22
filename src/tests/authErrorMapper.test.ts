import { describe, it, expect } from "vitest";
import { isValidEmailFormat, mapFirebaseAuthError } from "@/src/lib/authErrorMapper";

describe("Authentication Error Mapper and Input Validator", () => {
  describe("isValidEmailFormat", () => {
    it("accepts valid email addresses", () => {
      expect(isValidEmailFormat("user@example.com")).toBe(true);
      expect(isValidEmailFormat("ahmed.hefni@domain.co.uk")).toBe(true);
      expect(isValidEmailFormat("test+filter@sub.taskflow.app")).toBe(true);
      expect(isValidEmailFormat("  spaces.trimmed@domain.com  ")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(isValidEmailFormat("")).toBe(false);
      expect(isValidEmailFormat("plainaddress")).toBe(false);
      expect(isValidEmailFormat("missing@domain")).toBe(false);
      expect(isValidEmailFormat("@missingusername.com")).toBe(false);
      expect(isValidEmailFormat("user@.com")).toBe(false);
      expect(isValidEmailFormat(null as unknown as string)).toBe(false);
    });
  });

  describe("mapFirebaseAuthError", () => {
    it("maps invalid credential errors safely without leaking internal details", () => {
      const err = { code: "auth/invalid-credential" };
      const arMsg = mapFirebaseAuthError(err, "ar");
      const enMsg = mapFirebaseAuthError(err, "en");

      expect(arMsg).toContain("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      expect(enMsg).toContain("Invalid email or password");
    });

    it("maps popup-closed-by-user accurately", () => {
      const err = { code: "auth/popup-closed-by-user" };
      expect(mapFirebaseAuthError(err, "ar")).toContain("تم إغلاق نافذة تسجيل الدخول");
      expect(mapFirebaseAuthError(err, "en")).toContain("window was closed");
    });

    it("maps popup-blocked with clear guidance to allow popups", () => {
      const err = { code: "auth/popup-blocked" };
      expect(mapFirebaseAuthError(err, "ar")).toContain("حظر المتصفح النافذة المنبثقة");
      expect(mapFirebaseAuthError(err, "en")).toContain("blocked the sign-in popup");
    });

    it("maps email-already-in-use to advise signing in", () => {
      const err = { code: "auth/email-already-in-use" };
      expect(mapFirebaseAuthError(err, "ar")).toContain("مسجل بالفعل");
      expect(mapFirebaseAuthError(err, "en")).toContain("already exists");
    });

    it("maps rate limiting (too-many-requests) without crashing", () => {
      const err = { code: "auth/too-many-requests" };
      expect(mapFirebaseAuthError(err, "ar")).toContain("تم حظر الوصول مؤقتاً");
      expect(mapFirebaseAuthError(err, "en")).toContain("temporarily blocked");
    });

    it("maps network failures safely", () => {
      const err = { code: "auth/network-request-failed" };
      expect(mapFirebaseAuthError(err, "ar")).toContain("تعذر الاتصال بالخادم");
      expect(mapFirebaseAuthError(err, "en")).toContain("Network error occurred");
    });

    it("falls back to generic user-friendly message for unknown error codes", () => {
      const err = { code: "auth/unknown-crazy-error-code", message: "Internal stack trace 0x88912" };
      const msgAr = mapFirebaseAuthError(err, "ar");
      const msgEn = mapFirebaseAuthError(err, "en");

      // Must not expose stack traces or raw SDK messages
      expect(msgAr).not.toContain("0x88912");
      expect(msgEn).not.toContain("0x88912");
      expect(msgAr).toContain("تعذر إتمام العملية");
      expect(msgEn).toContain("Unable to complete operation");
    });
  });
});
