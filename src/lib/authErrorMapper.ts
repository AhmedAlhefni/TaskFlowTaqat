/**
 * Firebase Auth Error Mapper & Validator
 * Translates Firebase internal auth error codes to human-friendly, localized messages
 * without leaking raw system errors or credentials.
 */

export type SupportedLanguage = "ar" | "en";

export interface AuthFieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * Validate email format with standard RFC 5322 compatible regex
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(trimmed);
}

/**
 * Maps Firebase Auth error codes to safe, localized user messages
 */
export function mapFirebaseAuthError(error: any, lang: SupportedLanguage): string {
  if (!error) return "";

  const code = typeof error === "object" && error !== null ? error.code || "" : String(error);

  const errorMessages: Record<string, { ar: string; en: string }> = {
    // Invalid credentials
    "auth/invalid-credential": {
      ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.",
      en: "Invalid email or password. Please check your credentials and try again.",
    },
    "auth/user-not-found": {
      ar: "لا يوجد حساب مسجل بهذا البريد الإلكتروني.",
      en: "No account found with this email address.",
    },
    "auth/wrong-password": {
      ar: "كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.",
      en: "Incorrect password. Please verify and try again.",
    },
    "auth/invalid-email": {
      ar: "صيغة البريد الإلكتروني غير صحيحة.",
      en: "The email address format is not valid.",
    },
    // Account state
    "auth/user-disabled": {
      ar: "تم تعطيل هذا الحساب. يرجى التواصل مع المسؤول للحصول على المساعدة.",
      en: "This account has been disabled. Please contact the administrator for assistance.",
    },
    "auth/email-already-in-use": {
      ar: "هذا البريد الإلكتروني مسجل بالفعل بحساب آخر. يمكنك تسجيل الدخول بدلاً من ذلك.",
      en: "An account already exists with this email address. Please sign in instead.",
    },
    "auth/weak-password": {
      ar: "كلمة المرور ضعيفة جداً. يجب أن تحتوي على 6 أحرف على الأقل.",
      en: "Password is too weak. It must be at least 6 characters long.",
    },
    // Rate limiting & security
    "auth/too-many-requests": {
      ar: "تم حظر الوصول مؤقتاً بسبب تكرار المحاولات غير الناجحة. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.",
      en: "Access temporarily blocked due to multiple failed attempts. Please wait a few minutes and try again.",
    },
    // Popup & Google Sign-In issues
    "auth/popup-closed-by-user": {
      ar: "تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.",
      en: "The sign-in window was closed before completion.",
    },
    "auth/cancelled-popup-request": {
      ar: "تم إلغاء المحاولة السابقة للنافذة المنبثقة.",
      en: "The previous popup request was cancelled.",
    },
    "auth/popup-blocked": {
      ar: "حظر المتصفح النافذة المنبثقة الخاصة بتسجيل الدخول. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.",
      en: "Your browser blocked the sign-in popup. Please allow popups for this site and try again.",
    },
    "auth/account-exists-with-different-credential": {
      ar: "يوجد حساب مسجل بالفعل بنفس البريد الإلكتروني باستخدام طريقة تسجيل دخول أخرى.",
      en: "An account already exists with this email using a different sign-in method.",
    },
    // Network & system
    "auth/network-request-failed": {
      ar: "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.",
      en: "Network error occurred. Please verify your internet connection and try again.",
    },
    "auth/operation-not-allowed": {
      ar: "طريقة تسجيل الدخول هذه غير مفعلة حالياً في النظام.",
      en: "This sign-in method is currently disabled.",
    },
    "auth/internal-error": {
      ar: "حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة مرة أخرى لاحقاً.",
      en: "An unexpected error occurred. Please try again later.",
    },
  };

  if (code && errorMessages[code]) {
    return errorMessages[code][lang];
  }

  // Fallback safe message without exposing stack traces or raw SDK codes
  return lang === "ar"
    ? "تعذر إتمام العملية في الوقت الحالي. يرجى المحاولة مرة أخرى."
    : "Unable to complete operation at this time. Please try again.";
}
