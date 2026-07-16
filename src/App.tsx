import React, { useState } from "react";
import { QuizState } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  ArrowLeft, 
  RotateCcw,
  ShieldCheck
} from "lucide-react";

const INITIAL_STATE: QuizState = {
  age: "",
  country: "",
  wantsAmira: "",
  wantsCatalogue: "",
  step: 1, // Start directly with the first question
};

export default function App() {
  const [state, setState] = useState<QuizState>(INITIAL_STATE);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [copiedLockCode, setCopiedLockCode] = useState(false);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim().toUpperCase() === "M2026") {
      setIsUnlocked(true);
      setCodeError("");
    } else {
      setCodeError("Code d'accès incorrect. Veuillez réessayer.");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText("M2026");
    setCopiedLockCode(true);
    setTimeout(() => setCopiedLockCode(false), 2000);
  };

  const handleSelectOption = (field: keyof QuizState, value: string) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
      step: prev.step + 1,
    }));
  };

  const handlePrevStep = () => {
    if (state.step > 1) {
      setState((prev) => ({
        ...prev,
        step: prev.step - 1,
      }));
    }
  };

  const handleRestart = () => {
    setState(INITIAL_STATE);
  };

  // Progress Percentage
  const progressPercent = Math.min(((state.step - 1) / 4) * 100, 100);

  if (!isUnlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-4 py-8 text-slate-800 font-sans selection:bg-blue-500/30">
        <div className="w-full max-w-[440px] bg-white rounded-[28px] border border-slate-100 shadow-xl p-8 sm:p-10 flex flex-col items-center" id="lock-card">
          
          {/* Avatar frame with Amira's photo */}
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50 shadow-md">
              <img
                src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/7ecf9fc5-15b1-431a-95c7-f1b94ce68728.png"
                alt="Amira Profile"
                className="h-full w-full object-cover animate-fade-in"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight text-center">
            ESPACE BIZI
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium text-center">
            Mettre le code dans la vidéo pour accéder
          </p>

          <div className="w-full border-b border-slate-100/80 my-6" />

          {/* Info code box matching screenshot layout */}
          <div className="w-full bg-[#fcf9f9] border border-[#f5eded] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
              VOTRE CODE D'ACCÈS
            </span>
            <div className="flex items-center gap-3">
              <div className="bg-[#eff6ff] text-[#2563eb] px-4 py-1.5 rounded-lg text-sm sm:text-base font-extrabold tracking-widest border border-[#dbeafe]/80">
                M2026
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm active:scale-95"
              >
                {copiedLockCode ? (
                  <span className="text-green-600 font-bold">Copié!</span>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleVerifyCode} className="w-full mt-6 space-y-4">
            <div>
              <label htmlFor="access-code-input" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                CODE D'ACCÈS
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="access-code-input"
                  type="text"
                  placeholder="Saisir le code..."
                  value={enteredCode}
                  onChange={(e) => {
                    setEnteredCode(e.target.value);
                    if (codeError) setCodeError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              {codeError && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                  <span>⚠️</span> {codeError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3.5 text-sm font-bold shadow-lg shadow-blue-500/15 transition-all duration-150 active:scale-[0.98]"
            >
              <span>Accéder</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          <div className="w-full border-b border-slate-100/80 my-6" />

          {/* Secure SSL indicator */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-black tracking-widest uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACCÈS SÉCURISÉ SSL</span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-100 font-sans selection:bg-rose-500/30 selection:text-white">
      {/* Decorative gradient background blur */}
      <div className="absolute -top-40 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 -z-10 h-[300px] w-[300px] rounded-full bg-rose-600/5 blur-[100px] pointer-events-none" />

      {/* Main Single Card Panel */}
      <div className="w-full max-w-lg" id="quiz-card-container">
        
        {/* Progress bar (only during the quiz, step 1 to 4) */}
        {state.step <= 4 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Filtre d'accès</span>
              <span className="text-rose-500 font-bold">Étape {state.step} / 4</span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: AGE */}
          {state.step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md sm:p-10"
              id="step-age"
            >
              <h1 className="text-center font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Quel est votre âge ?
              </h1>
              <p className="mt-2 text-center text-xs text-slate-400">
                Veuillez sélectionner votre tranche d'âge pour continuer.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  { label: "18-25 ans", value: "18-25 ans" },
                  { label: "26-35 ans", value: "26-35 ans" },
                  { label: "plus de 36 ans", value: "plus de 36 ans" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption("age", opt.value)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/35 px-5 py-4 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-rose-500/30 hover:bg-slate-900/80 hover:text-white"
                  >
                    <span>{opt.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: COUNTRY */}
          {state.step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md sm:p-10"
              id="step-country"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Retour</span>
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800/80 shadow-lg">
                <img
                  src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/76cad39d-ac23-4be6-b75a-ccdd4c33a47f.png"
                  alt="Club Amira Banner"
                  className="w-full h-auto object-cover max-h-56 sm:max-h-64"
                  referrerPolicy="no-referrer"
                />
              </div>

              <h1 className="mt-6 text-center font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Quel est votre pays ?
              </h1>
              <p className="mt-2 text-center text-xs text-slate-400">
                Sélectionnez votre localisation pour obtenir les bons contacts.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  { label: "Togo 🇹🇬", value: "Togo" },
                  { label: "Benin 🇧🇯", value: "Benin" },
                  { label: "Côte d'ivoire 🇨🇮", value: "Côte d'ivoire" },
                  { label: "Cameroun 🇨🇲", value: "Cameroun" },
                  { label: "Senegal 🇸🇳", value: "Senegal" },
                  { label: "Autre 🌍", value: "Autre" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption("country", opt.value)}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/35 px-4.5 py-4 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-rose-500/30 hover:bg-slate-900/80 hover:text-white"
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: AMIRA'S DIRECT OFFER */}
          {state.step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md sm:p-10"
              id="step-amira-offer"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Retour</span>
                </button>
              </div>

              {/* Conversational Avatar Design */}
              <div className="mt-4 flex flex-col items-center">
                <div className="relative">
                  <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-rose-500 bg-slate-900 shadow-xl">
                    <img
                      src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/7ecf9fc5-15b1-431a-95c7-f1b94ce68728.png"
                      alt="Amira"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 ring-2 ring-slate-950" />
                </div>
                <span className="mt-2.5 text-xs font-bold text-green-400">Amira est en ligne</span>
              </div>

              <h2 className="mt-5 text-center font-sans text-lg font-medium leading-relaxed text-slate-100 px-2 sm:text-xl">
                Je suis Amira, je te propose un mougouli à 7000f? voulez vous son numéro WhatsApp ?
              </h2>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => handleSelectOption("wantsAmira", "OUI")}
                  className="flex w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 py-4 text-sm font-bold text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-900"
                >
                  OUI
                </button>
                <button
                  onClick={() => handleSelectOption("wantsAmira", "JE SUIS CHAUD")}
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 py-4 text-sm font-black text-white shadow-lg shadow-rose-950/40 transition hover:from-rose-500 hover:to-rose-400"
                >
                  JE SUIS CHAUD
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: CATALOGUE OFFER */}
          {state.step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-slate-900 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md sm:p-10"
              id="step-catalogue-offer"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Retour</span>
                </button>
              </div>

              {/* Deux images l'une à côté de l'autre */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="overflow-hidden rounded-2xl border border-slate-900/60 shadow-lg aspect-[4/5]">
                  <img
                    src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/18f408a9-879d-4629-ab6f-bb245d6830ea.jpg"
                    alt="Aperçu Catalogue 1"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-900/60 shadow-lg aspect-[4/5]">
                  <img
                    src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/8b3c6e8c-bd9c-49e7-9b6f-01df5166e808.jpg"
                    alt="Aperçu Catalogue 2"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900 shadow-md">
                <img
                  src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/a54a78c4-d777-45cb-939a-69ce5e28e28c.png"
                  alt="Aperçu VIP"
                  className="w-full h-auto object-cover max-h-56 sm:max-h-64"
                  referrerPolicy="no-referrer"
                />
              </div>

              <h2 className="mt-5 text-center font-sans text-base font-medium leading-relaxed text-slate-200 sm:text-lg">
                Dans ce cas je vous propose aussi un catalogue complet de plus de 100 numéros WhatsApp de kpoclé que tu peux appeler pour mougouli;
                tu es interessé ?
              </h2>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => handleSelectOption("wantsCatalogue", "OUI")}
                  className="flex w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 py-4 text-sm font-bold text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-900"
                >
                  OUI
                </button>
                <button
                  onClick={() => handleSelectOption("wantsCatalogue", "Bien sur")}
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 py-4 text-sm font-black text-white shadow-lg shadow-rose-950/40 transition hover:from-rose-500 hover:to-rose-400"
                >
                  Bien sur
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: FINAL OFFER & CHECKOUT */}
          {state.step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-slate-900 bg-slate-950/65 p-6 shadow-2xl backdrop-blur-md sm:p-10"
              id="step-final-checkout"
            >
              <div className="mb-6 overflow-hidden rounded-2xl border border-slate-900 shadow-md">
                <img
                  src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/a54a78c4-d777-45cb-939a-69ce5e28e28c.png"
                  alt="Aperçu Catalogue VIP"
                  className="w-full h-auto object-cover max-h-56 sm:max-h-64"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Copy part 1 */}
              <p className="text-center text-base font-bold text-white leading-relaxed sm:text-lg">
                Parfait, voici le catalogue que j'ai préparer pour toi. Ya mon numéro dedans avec plus de 150 kpoklé de (Togo, Bénin, côte d'ivoire, Senegal, Burkina Faso, Mali, Cameroun, Niger…)
              </p>

              {/* trust badge image */}
              <div className="mt-5 flex justify-center">
                <img
                  src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/a226fcac-e7a5-4f22-87f9-213ae88f60f7.svg"
                  alt="Badge de confiance"
                  className="h-10 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Copy part 2 */}
              <div className="mt-5 rounded-2xl bg-rose-950/15 border border-rose-900/20 p-4.5 text-center text-xs text-rose-300 leading-relaxed font-medium">
                "C'est satisfait ou rembourssé, y a mon numéro dedans, donc si tu n'est pas interessé, tu m'ecris et je te remboursse ton jeton."
              </div>

              {/* Action area */}
              <div className="mt-8 space-y-4">
                <a
                  href="https://izimomo.vercel.app/pay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 py-4.5 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-rose-950/60 transition hover:from-rose-500 hover:to-rose-300"
                  id="buy-button"
                >
                  ACHETER LE CATALOGUE
                </a>

                <button
                  onClick={handleRestart}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  Recommencer le quiz
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Discretion badge at the bottom */}
      <div className="mt-8 text-center text-[10px] text-slate-600 flex items-center justify-center gap-1 pointer-events-none">
        <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
        <span>Tunnel de sélection d'accès strictement privé et réservé aux adultes de 18 ans et plus.</span>
      </div>
    </div>
  );
}
