import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Send, 
  Check, 
  CheckCheck, 
  LogOut, 
  Database, 
  AlertCircle, 
  Sparkles, 
  MessageSquare,
  Search,
  Trash2,
  Copy,
  ArrowLeft
} from "lucide-react";
import { 
  supabase, 
  isSupabaseConfigured, 
  getLocalMessages, 
  saveLocalMessage, 
  markLocalMessagesAsRead,
  Message,
  demoChannel,
  generateUUID
} from "../supabaseClient";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);
  const [usingLocalFallback, setUsingLocalFallback] = useState(!isSupabaseConfigured);
  const [showGuide, setShowGuide] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load and Subscribe to Messages
  useEffect(() => {
    if (!usingLocalFallback && isSupabaseConfigured && supabase) {
      // Fetch all messages
      supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.warn("Supabase error, falling back to local:", error);
            setUsingLocalFallback(true);
            return;
          }
          if (data) {
            setMessages(data as Message[]);
          }
        });

      // Subscribe to all changes on messages
      const channel = supabase
        .channel("admin_all_messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newMsg = payload.new as Message;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            } else if (payload.eventType === "UPDATE") {
              const updatedMsg = payload.new as Message;
              setMessages((prev) =>
                prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel).then();
      };
    } else {
      // Demo Mode Fallback
      const loadLocal = () => {
        setMessages(getLocalMessages());
      };

      loadLocal();

      const handleLocalMessage = (e: Event) => {
        const customEvent = e as CustomEvent<Message>;
        if (customEvent.detail) {
          setMessages((prev) => {
            if (prev.some(m => m.id === customEvent.detail.id)) return prev;
            return [...prev, customEvent.detail];
          });
        }
      };

      const handleLocalUpdate = () => {
        loadLocal();
      };

      window.addEventListener("bizi_local_message", handleLocalMessage);
      window.addEventListener("bizi_local_update", handleLocalUpdate);

      // Broadcast channel
      if (demoChannel) {
        const handleBroadcast = (event: MessageEvent) => {
          loadLocal();
        };
        demoChannel.addEventListener("message", handleBroadcast);
        return () => {
          window.removeEventListener("bizi_local_message", handleLocalMessage);
          window.removeEventListener("bizi_local_update", handleLocalUpdate);
          demoChannel.removeEventListener("message", handleBroadcast);
        };
      }

      return () => {
        window.removeEventListener("bizi_local_message", handleLocalMessage);
        window.removeEventListener("bizi_local_update", handleLocalUpdate);
      };
    }
  }, [usingLocalFallback]);

  // Mark visitor messages as read when select visitor
  useEffect(() => {
    if (!selectedVisitorId) return;

    if (!usingLocalFallback && isSupabaseConfigured && supabase) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .eq("visitor_id", selectedVisitorId)
        .eq("sender", "visitor")
        .then(({ error }) => {
          if (error) {
            console.warn("Supabase update error, falling back locally:", error);
            markLocalMessagesAsRead(selectedVisitorId, "visitor");
            setUsingLocalFallback(true);
          }
        });
    } else {
      markLocalMessagesAsRead(selectedVisitorId, "visitor");
    }
  }, [selectedVisitorId, messages.length, usingLocalFallback]);

  // Scroll active chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedVisitorId, messages.filter(m => m.visitor_id === selectedVisitorId).length]);

  // Group messages by visitor
  const groupedVisitors = React.useMemo(() => {
    const map = new Map<string, { visitor_id: string; visitor_name: string; lastMessage: Message; unreadCount: number }>();

    messages.forEach((msg) => {
      const current = map.get(msg.visitor_id);
      
      // Compute unread count (unread if from visitor and is_read is false)
      const isUnread = msg.sender === "visitor" && !msg.is_read;
      const unreadDelta = isUnread ? 1 : 0;

      if (!current) {
        map.set(msg.visitor_id, {
          visitor_id: msg.visitor_id,
          visitor_name: msg.visitor_name || "Visiteur anonyme",
          lastMessage: msg,
          unreadCount: unreadDelta,
        });
      } else {
        // Keep latest metadata
        const newName = msg.sender === "visitor" ? msg.visitor_name : current.visitor_name;
        const newLast = new Date(msg.created_at) > new Date(current.lastMessage.created_at)
          ? msg
          : current.lastMessage;
        
        map.set(msg.visitor_id, {
          visitor_id: msg.visitor_id,
          visitor_name: newName || current.visitor_name,
          lastMessage: newLast,
          unreadCount: current.unreadCount + unreadDelta,
        });
      }
    });

    // Convert map to array and sort by latest message time
    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    });
  }, [messages]);

  // Filtered visitors by search term
  const filteredVisitors = groupedVisitors.filter((v) =>
    v.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.lastMessage.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Active chat messages
  const activeMessages = selectedVisitorId
    ? messages.filter((m) => m.visitor_id === selectedVisitorId)
    : [];

  const selectedVisitor = groupedVisitors.find(v => v.visitor_id === selectedVisitorId);

  // Send Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitorId || !replyText.trim()) return;

    const currentVisitorName = selectedVisitor?.visitor_name || "Visiteur anonyme";

    const newMsg: Message = {
      id: generateUUID(),
      visitor_id: selectedVisitorId,
      visitor_name: currentVisitorName,
      sender: "admin",
      text: replyText.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setReplyText("");

    if (!usingLocalFallback && isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("messages").insert(newMsg);
      if (error) {
        console.warn("Erreur de réponse Supabase, basculement en local:", error);
        saveLocalMessage(newMsg);
        setUsingLocalFallback(true);
      }
    } else {
      saveLocalMessage(newMsg);
    }
  };

  // Clear all local messages for clean testing
  const handleClearLocal = () => {
    if (confirm("Voulez-vous vraiment effacer tous les messages locaux ?")) {
      localStorage.removeItem("bizi_messages");
      setMessages([]);
      setSelectedVisitorId(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("bizi_local_update"));
      }
    }
  };

  // Simulate incoming visitor message for Demo Mode testing
  const handleSimulateMessage = () => {
    const simulatedNames = ["Jean (Togo, 25 ans)", "Koffi (Bénin, 21 ans)", "Moussa (Mali, 29 ans)", "Amadou (Senegal, 31 ans)", "Gilles (Cameroun, 24 ans)"];
    const randomName = simulatedNames[Math.floor(Math.random() * simulatedNames.length)];
    const simulatedQueries = [
      "Salut Amira, je suis chaud pour le catalogue !",
      "Combien coûte le catalogue VIP ?",
      "Y a t-il des kpoclé du Togo dedans ?",
      "S'il te plaît, est-ce que ton vrai numéro est inclus ?",
      "Je viens de faire le quiz, je veux mougouli direct !"
    ];
    const randomText = simulatedQueries[Math.floor(Math.random() * simulatedQueries.length)];
    const simVisitorId = "sim_" + Math.random().toString(36).substring(2, 7);

    const newMsg: Message = {
      id: generateUUID(),
      visitor_id: simVisitorId,
      visitor_name: randomName,
      sender: "visitor",
      text: randomText,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    if (!usingLocalFallback && isSupabaseConfigured && supabase) {
      supabase.from("messages").insert(newMsg).then(({ error }) => {
        if (error) {
          console.warn("Error simulating message, falling back:", error);
          saveLocalMessage(newMsg);
          setUsingLocalFallback(true);
        }
      });
    } else {
      saveLocalMessage(newMsg);
    }
  };

  // SQL code to copy
  const sqlSchema = `-- Étape 1 : Créer la table des messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  sender TEXT NOT NULL, -- 'visitor' ou 'admin'
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL
);

-- Étape 2 : Désactiver la sécurité RLS pour permettre les lectures/écritures anonymes publiques (obligatoire pour le chat visiteur)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Étape 3 : Activer le temps réel (Realtime) de Supabase pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl min-h-[600px] bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-row text-slate-100 font-sans">
      
      {/* Left sidebar: Thread index */}
      <div className={`w-full md:w-[350px] border-r border-slate-900/80 bg-slate-950 flex-col shrink-0 ${selectedVisitorId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header brand */}
        <div className="p-4 bg-[#202c33] border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#00e676] animate-pulse" />
            <h1 className="text-xs font-bold uppercase tracking-wider text-[#e9edef]">WhatsApp Admin Panel</h1>
          </div>
          <button
            onClick={onLogout}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 hover:text-white transition-all duration-150"
            title="Quitter l'administration"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Database status */}
        <div className="px-4 py-3 border-b border-slate-900/60 bg-[#182229] flex flex-col gap-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-[#aebac1] font-medium flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-[#8696a0]" />
              {usingLocalFallback 
                ? (isSupabaseConfigured ? "Supabase (Échec - Repli Local)" : "Stockage Démo Local")
                : "Supabase Connecté"}
            </span>
            <span className={`h-2.5 w-2.5 rounded-full ${(!usingLocalFallback && isSupabaseConfigured) ? "bg-[#00e676]" : "bg-amber-500 animate-pulse"}`} />
          </div>
          {usingLocalFallback && isSupabaseConfigured && (
            <button
              onClick={() => {
                setUsingLocalFallback(false);
              }}
              className="mt-1 w-full text-center py-1.5 bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 rounded-lg border border-rose-500/20 text-[10px] font-bold transition active:scale-[0.98]"
            >
              🔄 Réessayer de connecter Supabase
            </button>
          )}
        </div>

        {/* Search */}
        <div className="p-3 bg-[#111b21] border-b border-slate-900/40">
          <div className="relative flex items-center bg-[#202c33] rounded-lg px-3.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-[#8696a0] mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher ou démarrer une discussion"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
            />
          </div>
        </div>

        {/* Visitors thread list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-900/40 bg-[#111b21]">
          {filteredVisitors.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8696a0] font-medium">
              Aucune discussion active.
            </div>
          ) : (
            filteredVisitors.map((visitor) => {
              const isActive = visitor.visitor_id === selectedVisitorId;
              const dateStr = new Date(visitor.lastMessage.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              
              return (
                <button
                  key={visitor.visitor_id}
                  onClick={() => setSelectedVisitorId(visitor.visitor_id)}
                  className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                    isActive ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                  }`}
                >
                  <div className="relative">
                    <div className="h-11 w-11 rounded-full bg-[#202c33] border border-slate-800 flex items-center justify-center text-xs font-black text-[#00a884]">
                      {visitor.visitor_name.substring(0, 2).toUpperCase()}
                    </div>
                    {visitor.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#00a884] text-[10px] font-bold text-[#111b21] rounded-full flex items-center justify-center ring-2 ring-[#111b21]">
                        {visitor.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold text-[#e9edef] truncate">{visitor.visitor_name}</h3>
                      <span className={`text-[10px] font-medium ${visitor.unreadCount > 0 ? "text-[#00a884]" : "text-[#8696a0]"}`}>{dateStr}</span>
                    </div>
                    <p className="text-[12px] text-[#8696a0] truncate mt-1 flex items-center gap-1">
                      {visitor.lastMessage.sender === "admin" ? (
                        <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] shrink-0" />
                      ) : null}
                      <span className="truncate">{visitor.lastMessage.text}</span>
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Local storage controls / simulated updates */}
        <div className="p-4 bg-[#111b21] border-t border-slate-900 flex flex-col gap-2">
          <button
            onClick={handleSimulateMessage}
            className="w-full rounded-xl bg-[#202c33] hover:bg-[#2a3942] border border-slate-800 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#e9edef] transition active:scale-98 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Simuler un message
          </button>
          {!isSupabaseConfigured && (
            <button
              onClick={handleClearLocal}
              className="w-full rounded-xl border border-rose-950/40 hover:border-rose-900/60 bg-[#202c33] hover:bg-rose-950/15 py-2.5 text-[11px] font-bold uppercase tracking-wider text-rose-400 transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vider le chat local
            </button>
          )}
        </div>
      </div>

      {/* Right panel: Conversations & DB helper */}
      <div className={`flex-1 bg-[#222e35] flex-col min-w-0 ${selectedVisitorId ? 'flex' : 'hidden md:flex'}`}>
        {selectedVisitorId ? (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0b141a]">
            {/* Active thread header */}
            <div className="p-3 bg-[#202c33] border-b border-slate-900 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVisitorId(null)}
                  className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10 hover:text-white transition-all duration-150 -ml-1 mr-1"
                  title="Retour aux discussions"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 rounded-full bg-[#111b21] border border-slate-800 flex items-center justify-center text-xs font-black text-[#00a884]">
                  {selectedVisitor?.visitor_name.substring(0, 2).toUpperCase() || "VI"}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#e9edef]">
                    {selectedVisitor?.visitor_name || "Visiteur anonyme"}
                  </h2>
                  <p className="text-[10px] text-[#8696a0] font-mono mt-0.5">
                    ID: {selectedVisitorId}
                  </p>
                </div>
              </div>
            </div>

            {/* Conversation message stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent bg-[#0b141a]">
              {activeMessages.map((msg) => {
                const isAdminMsg = msg.sender === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[75%] rounded-[14px] px-3.5 py-2 text-xs text-[#e9edef] leading-relaxed shadow-sm break-words flex flex-col ${
                        isAdminMsg
                          ? "bg-[#005c4b] rounded-tr-none"
                          : "bg-[#202c33] rounded-tl-none"
                      }`}
                    >
                      <div className="pr-12 text-[12.5px] whitespace-pre-wrap">{msg.text}</div>
                      <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none">
                        <span className="text-[9px] text-[#8696a0] font-medium">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isAdminMsg && (
                          msg.is_read ? (
                            <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                          ) : (
                            <Check className="h-3 w-3 text-[#8696a0]" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Admin reply bar */}
            <form onSubmit={handleSendReply} className="p-3 bg-[#111b21] border-t border-slate-900/40 flex items-center gap-2">
              <div className="flex-1 relative flex items-center bg-[#202c33] rounded-full px-4 py-2">
                <input
                  type="text"
                  placeholder={`Écris un message pour ${selectedVisitor?.visitor_name || "l'utilisateur"}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-[13px] text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] hover:bg-[#008f72] text-white disabled:opacity-40 disabled:hover:bg-[#00a884] transition-all duration-150 active:scale-90 shadow-md"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center items-center text-center bg-[#222e35]">
            {/* Empty state dashboard info */}
            <div className="max-w-md space-y-6">
              <div className="mx-auto h-20 w-20 rounded-full bg-[#111b21] border border-slate-800 flex items-center justify-center text-[#00a884]">
                <MessageSquare className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e9edef]">WhatsApp Web pour l'Admin</h3>
                <p className="mt-2 text-xs text-[#8696a0] leading-relaxed">
                  Sélectionnez un visiteur dans la barre latérale gauche pour afficher l'historique complet de sa session et lui répondre en direct avec une interface fluide et instantanée.
                </p>
              </div>

              {/* Collapsible Supabase Connection Guide */}
              <div className="w-full flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs font-semibold text-[#00a884] hover:underline flex items-center gap-1.5 focus:outline-none transition-all duration-150 py-2 px-4 rounded-lg bg-[#111b21] border border-slate-800/60"
                >
                  <Database className="h-3.5 w-3.5" />
                  {showGuide ? "Masquer les instructions SQL / Supabase" : "Afficher les instructions de configuration Supabase"}
                </button>

                {showGuide && (
                  <div className="mt-4 rounded-2xl border border-slate-800/80 bg-[#111b21] p-5 text-left text-xs space-y-3 shadow-md w-full">
                    {usingLocalFallback && isSupabaseConfigured ? (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-2 mb-2">
                        <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                          ⚠️ Connexion échouée (Repli local temporaire)
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Vos identifiants Supabase sont bien détectés, mais l'application n'arrive pas à interagir avec la table <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded text-white text-[10px]">messages</code>. Elle n'existe probablement pas encore ou a une structure différente.
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          <strong>Solution :</strong> Copiez-collez le script SQL ci-dessous dans l'éditeur SQL de votre console Supabase (onglet <strong>SQL Editor</strong>) puis cliquez sur le bouton <strong className="text-white">"Run" (Exécuter)</strong>. Une fois fait, cliquez sur le bouton <strong className="text-white">"Réessayer de connecter Supabase"</strong> dans la barre latérale gauche.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                        <Database className="h-4 w-4" />
                        Guide de déploiement Supabase
                      </div>
                    )}
                    
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Pour activer la vraie persistance mondiale et le temps réel, vous devez créer une base de données gratuite sur <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-bold">supabase.com</a> et y exécuter ce code.
                    </p>

                    <div className="bg-[#0b141a] border border-slate-800 rounded-xl p-3.5 font-mono text-[10px] text-slate-400 relative">
                      <pre className="overflow-x-auto whitespace-pre">{sqlSchema}</pre>
                      <button
                        type="button"
                        onClick={copySqlToClipboard}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#202c33] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition active:scale-95"
                        title="Copier le code SQL"
                      >
                        {copiedSql ? <span className="text-green-500 text-[9px] font-bold font-sans">Copié!</span> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 leading-relaxed space-y-1">
                      <p className="font-bold text-slate-200">Variables d'environnement requises :</p>
                      <p>• <span className="font-mono text-[#00a884]">VITE_SUPABASE_URL</span> : URL d'API de votre projet Supabase</p>
                      <p>• <span className="font-mono text-[#00a884]">VITE_SUPABASE_ANON_KEY</span> : Clé anonyme (Anon Key)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
