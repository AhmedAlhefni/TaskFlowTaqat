import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckSquare,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { useLanguage } from "@/src/context/LanguageContext";
import { mapFirebaseAuthError } from "@/src/lib/authErrorMapper";
import {
  createLoginSchema,
  createRegisterSchema,
  createForgotSchema,
} from "@/src/lib/schemas";

type AuthMode = "login" | "register" | "forgot";
type SubmittingMode = "none" | "email" | "google" | "demo" | "reset";

interface FormFields {
  name?: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

export const AuthScreen: React.FC<{
  initialMode?: "login" | "register";
  onModeChange?: (mode: "login" | "register") => void;
}> = ({ initialMode = "login", onModeChange }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInvalidCred, setIsInvalidCred] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [submittingMode, setSubmittingMode] = useState<SubmittingMode>("none");

  const { loginWithEmail, registerWithEmail, loginWithGoogle, sendPasswordReset } = useAuth();
  const { language, t, direction } = useLanguage();

  const isSubmitting = submittingMode !== "none";

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    if (nextMode === "login" || nextMode === "register") onModeChange?.(nextMode);
  };

  // Dynamic Zod resolver based on mode
  const activeSchema = React.useMemo(() => {
    if (mode === "forgot") return createForgotSchema(t);
    if (mode === "register") return createRegisterSchema(t);
    return createLoginSchema(t);
  }, [mode, t]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FormFields>({
    resolver: zodResolver(activeSchema as any),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // Reset errors when mode changes
  useEffect(() => {
    setErrorMsg(null);
    setIsInvalidCred(false);
    setResetSuccessMsg(null);
  }, [mode]);

  const onFormSubmit = async (data: FormFields) => {
    if (isSubmitting) return;

    setErrorMsg(null);
    setIsInvalidCred(false);
    setResetSuccessMsg(null);

    const email = data.email.trim();

    if (mode === "forgot") {
      setSubmittingMode("reset");
      try {
        await sendPasswordReset(email);
        setResetSuccessMsg(t("resetLinkSent"));
      } catch (err: any) {
        const message = mapFirebaseAuthError(err, language as "ar" | "en");
        setErrorMsg(message);
      } finally {
        setSubmittingMode("none");
      }
      return;
    }

    setSubmittingMode("email");
    const password = data.password || "";

    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, (data.name || "").trim());
      }
    } catch (err: any) {
      const code = err?.code || "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setIsInvalidCred(true);
      }
      const message = mapFirebaseAuthError(err, language as "ar" | "en");
      setErrorMsg(message);
    } finally {
      setSubmittingMode("none");
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;

    setSubmittingMode("google");
    setErrorMsg(null);
    setIsInvalidCred(false);
    setResetSuccessMsg(null);

    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        const message = mapFirebaseAuthError(err, language as "ar" | "en");
        setErrorMsg(message);
      }
    } finally {
      setSubmittingMode("none");
    }
  };

  const [loadingDemoEmail, setLoadingDemoEmail] = useState<string | null>(null);

  // 1-Click Instant Demo Access
  const handleQuickDemoLogin = async (demoEmail: string, displayName: string) => {
    if (isSubmitting) return;

    changeMode("login");
    setSubmittingMode("demo");
    setLoadingDemoEmail(demoEmail);
    setErrorMsg(null);
    setIsInvalidCred(false);
    setResetSuccessMsg(null);

    setValue("email", demoEmail);
    const demoPass = "DemoPass123!";
    setValue("password", demoPass);
    setValue("confirmPassword", demoPass);
    setValue("name", displayName);

    try {
      // 1. Try to log in directly
      await loginWithEmail(demoEmail, demoPass);
    } catch (err: any) {
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/user-not-found"
      ) {
        // 2. Auto-register demo account if not exists
        try {
          await registerWithEmail(demoEmail, demoPass, displayName);
        } catch (regErr: any) {
          const message = mapFirebaseAuthError(regErr, language as "ar" | "en");
          setErrorMsg(message);
        }
      } else {
        const message = mapFirebaseAuthError(err, language as "ar" | "en");
        setErrorMsg(message);
      }
    } finally {
      setSubmittingMode("none");
      setLoadingDemoEmail(null);
    }
  };

  const switchToRegisterWithCurrentEmail = () => {
    const currentEmail = getValues("email");
    const currentPass = getValues("password");
    changeMode("register");
    setErrorMsg(null);
    setIsInvalidCred(false);
    setResetSuccessMsg(null);
    if (currentEmail) {
      setValue("email", currentEmail);
      setValue("name", currentEmail.split("@")[0]);
    }
    if (currentPass) {
      setValue("password", currentPass);
      setValue("confirmPassword", currentPass);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-all">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 mb-4">
            <CheckSquare className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {mode === "login"
              ? t("welcomeBack")
              : mode === "register"
              ? t("registerTitle")
              : t("resetPasswordTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {mode === "login"
              ? t("loginSubtitle")
              : mode === "register"
              ? t("registerSubtitle")
              : t("resetPasswordSubtitle")}
          </p>
        </div>

        {/* Success Alert */}
        {resetSuccessMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{resetSuccessMsg}</p>
          </div>
        )}

        {/* Error Alert with Smart Recovery Action */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold space-y-2 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed flex-1">{errorMsg}</p>
            </div>
            {isInvalidCred && mode === "login" && (
              <button
                type="button"
                onClick={switchToRegisterWithCurrentEmail}
                className="w-full mt-2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {language === "ar"
                    ? "إنشاء حساب جديد بهذا البريد الآن"
                    : "Create an account with this email now"}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Google Sign In */}
        {mode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold text-sm flex items-center justify-center gap-3 shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition-colors disabled:opacity-50 cursor-pointer mb-6"
            >
              {submittingMode === "google" ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  <span>{t("connectingGoogle")}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t("signInWithGoogle")}</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Email & Password Form (Powered by React Hook Form & Zod) */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("fullName")} *
              </label>
              <div className="relative">
                <input
                  {...register("name")}
                  type="text"
                  disabled={isSubmitting}
                  placeholder={language === "ar" ? "أحمد محمد" : "John Doe"}
                  className={`w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all disabled:opacity-60 ${
                    errors.name
                      ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  }`}
                />
                <User className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.name.message}</span>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("email")} *
            </label>
            <div className="relative">
              <input
                {...register("email")}
                type="email"
                disabled={isSubmitting}
                placeholder="name@example.com"
                className={`w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all disabled:opacity-60 ${
                  errors.email
                    ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                }`}
              />
              <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("password")} *
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      changeMode("forgot");
                      reset({ email: getValues("email"), password: "", confirmPassword: "" });
                    }}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {t("forgotPassword")}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  className={`w-full ps-10 pe-11 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all disabled:opacity-60 ${
                    errors.password
                      ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  }`}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  className="absolute end-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("confirmPassword")} *
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  className={`w-full ps-10 pe-11 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all disabled:opacity-60 ${
                    errors.confirmPassword
                      ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  }`}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                  className="absolute end-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.confirmPassword.message}</span>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {submittingMode === "reset"
                    ? t("sendingResetLink")
                    : submittingMode === "demo"
                    ? (language === "ar" ? "جاري تسجيل الدخول بالحساب التجريبي..." : "Signing in with demo account...")
                    : mode === "login"
                    ? t("signingIn")
                    : t("creatingAccount")}
                </span>
              </div>
            ) : (
              <>
                {mode === "forgot" ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{t("sendResetLink")}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "login" ? t("login") : t("register")}</span>
                    {direction === "rtl" ? (
                      <ArrowLeft className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Back to Login / Toggle Mode */}
        {mode === "forgot" ? (
          <div className="mt-6 text-center text-xs">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                changeMode("login");
                reset();
              }}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {t("backToLogin")}
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>
              {mode === "login" ? t("dontHaveAccount") : t("alreadyHaveAccount")}{" "}
            </span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const nextMode = mode === "login" ? "register" : "login";
                changeMode(nextMode);
                reset({
                  name: "",
                  email: getValues("email"),
                  password: "",
                  confirmPassword: "",
                });
              }}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ms-1 cursor-pointer disabled:opacity-50"
            >
              {mode === "login" ? t("register") : t("login")}
            </button>
          </div>
        )}

        {/* 1-Click Demo Evaluation Accounts (Appears ONLY on Login tab, hidden on Register) */}
        {mode === "login" && (
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2.5 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {language === "ar"
                  ? "دخول فوري بحساب تجريبي (للتقييم بنقرة واحدة):"
                  : "Instant Demo Access (1-click evaluation):"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  handleQuickDemoLogin("owner@taskflow.demo", "Ahmad (Owner)")
                }
                className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-900 transition-all text-center cursor-pointer disabled:opacity-50 flex flex-col items-center justify-center"
              >
                {loadingDemoEmail === "owner@taskflow.demo" ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-[11px]">{language === "ar" ? "جاري الدخول..." : "Entering..."}</span>
                  </div>
                ) : (
                  <>
                    <span>{language === "ar" ? "حساب المالك" : "Owner Account"}</span>
                    <span className="block text-[10px] font-normal opacity-75">owner@taskflow.demo</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  handleQuickDemoLogin("member@taskflow.demo", "Sara (Member)")
                }
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all text-center cursor-pointer disabled:opacity-50 flex flex-col items-center justify-center"
              >
                {loadingDemoEmail === "member@taskflow.demo" ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-[11px]">{language === "ar" ? "جاري الدخول..." : "Entering..."}</span>
                  </div>
                ) : (
                  <>
                    <span>{language === "ar" ? "حساب العضو" : "Member Account"}</span>
                    <span className="block text-[10px] font-normal opacity-75">member@taskflow.demo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
