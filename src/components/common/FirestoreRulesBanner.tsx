import React, { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { useLanguage } from "@/src/context/LanguageContext";

export const FirestoreRulesBanner: React.FC = () => {
  const { language } = useLanguage();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  useEffect(() => {
    let offlineTimeout: number | undefined;
    const handlePermissionDenied = () => setPermissionDenied(true);
    const handleOfflineWarning = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      const message = detail?.message || (language === "ar"
        ? "تعذر الاتصال بـ Firestore. التغيير المحلي لم يُحفظ في السحابة بعد."
        : "Firestore is unreachable. This local change has not been saved to the cloud yet.");
      setOfflineMessage(message);
      if (offlineTimeout !== undefined) window.clearTimeout(offlineTimeout);
      offlineTimeout = window.setTimeout(() => setOfflineMessage(null), 8000);
    };

    window.addEventListener("taskflow_firestore_permission_denied", handlePermissionDenied);
    window.addEventListener("taskflow_offline_sync_warning", handleOfflineWarning);
    return () => {
      window.removeEventListener("taskflow_firestore_permission_denied", handlePermissionDenied);
      window.removeEventListener("taskflow_offline_sync_warning", handleOfflineWarning);
      if (offlineTimeout !== undefined) window.clearTimeout(offlineTimeout);
    };
  }, [language]);

  if (!permissionDenied && !offlineMessage) return null;

  return (
    <>
      {permissionDenied && (
        <div role="alert" className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {language === "ar"
                  ? "رفضت قواعد Firestore هذا الطلب. أخفينا البيانات التي لم نتمكن من التحقق من صلاحية الوصول إليها. راجع قواعد Firestore وعضوية الحساب في المشروع."
                  : "Firestore denied this request. Data whose access could not be confirmed is hidden. Review the Firestore rules and this account’s project membership."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPermissionDenied(false)}
              aria-label={language === "ar" ? "إغلاق التنبيه" : "Dismiss alert"}
              className="p-1 text-amber-700 dark:text-amber-400 opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {offlineMessage && (
        <div role="status" className="bg-orange-500/15 border-b border-orange-500/30 text-orange-950 dark:text-orange-200 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="font-medium">{offlineMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setOfflineMessage(null)}
              aria-label={language === "ar" ? "إغلاق التنبيه" : "Dismiss notice"}
              className="p-1 text-orange-700 dark:text-orange-400 opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
