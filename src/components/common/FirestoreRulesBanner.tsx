import React, { useState, useEffect } from "react";
import { ShieldAlert, Copy, Check, ExternalLink, X, Info } from "lucide-react";
import { useLanguage } from "@/src/context/LanguageContext";
import { ModalLayer } from "@/src/components/common/ModalLayer";

export const FirestoreRulesBanner: React.FC = () => {
  const { language } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handlePermissionDenied = () => {
      setShowBanner(true);
    };

    const handleOfflineWarning = (e: any) => {
      const msg = e.detail?.message || (language === "ar"
        ? "تنبيه: تعذر الاتصال بـ Firestore السحابي. تم حفظ التغيير محلياً فقط ولم يُحفظ في السحابة."
        : "Notice: Cloud connection unavailable. Changes saved locally only.");
      setOfflineMessage(msg);
      // Automatically hide after 8 seconds
      setTimeout(() => {
        setOfflineMessage(null);
      }, 8000);
    };

    window.addEventListener("taskflow_firestore_permission_denied", handlePermissionDenied);
    window.addEventListener("taskflow_offline_sync_warning", handleOfflineWarning);
    return () => {
      window.removeEventListener("taskflow_firestore_permission_denied", handlePermissionDenied);
      window.removeEventListener("taskflow_offline_sync_warning", handleOfflineWarning);
    };
  }, [language]);

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleRules);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!showBanner && !offlineMessage) return null;

  return (
    <>
      {offlineMessage && (
        <div className="bg-orange-500/15 border-b border-orange-500/30 text-orange-950 dark:text-orange-200 px-4 py-2 text-xs transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="font-medium">{offlineMessage}</span>
            </div>
            <button
              onClick={() => setOfflineMessage(null)}
              className="p-1 text-orange-700 dark:text-orange-400 hover:opacity-100 opacity-70 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showBanner && (
        <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {language === "ar"
                  ? "قواعد Firestore في Firebase Console بحاجة للتفعيل. يعمل التطبيق حالياً بالوضع التفاعلي المحلي حتى تقوم بنشر القواعد."
                  : "Firestore rules on Firebase Console need publishing. Running in local reactive mode."}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowModal(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                {language === "ar" ? "نسخ القواعد والتعليمات" : "View & Copy Rules"}
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="p-1 text-amber-700 dark:text-amber-400 hover:opacity-100 opacity-70 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ModalLayer onClose={() => setShowModal(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === "ar" ? "تفعيل قواعد أمان Firestore" : "Deploy Firestore Security Rules"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === "ar"
                ? "قاعدة البيانات الخاصة بك في Firebase Console في وضع مغلق (Missing or insufficient permissions). لتفعيل التزامن السحابي:"
                : "Your Firestore database on Firebase Console is currently locked. To enable cloud sync:"}
            </p>

            <ol className="text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <li>
                {language === "ar" ? "افتح " : "Open "}
                <a
                  href="https://console.firebase.google.com/project/taskflowtaqat/firestore/rules"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-bold underline inline-flex items-center gap-1"
                >
                  Firebase Console Rules
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>{language === "ar" ? "انسخ الكود أدناه والصقه هناك." : "Copy the code below and paste it there."}</li>
              <li>{language === "ar" ? "اضغط على زر Publish (نشر)." : "Click the 'Publish' button."}</li>
            </ol>

            <div className="relative">
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                {sampleRules}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2.5 end-2.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (language === "ar" ? "تم النسخ!" : "Copied!") : (language === "ar" ? "نسخ" : "Copy")}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {language === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
        </ModalLayer>
      )}
    </>
  );
};
