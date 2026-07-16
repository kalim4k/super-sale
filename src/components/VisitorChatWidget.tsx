import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Check, CheckCheck, MessageSquare } from "lucide-react";
import { 
  supabase, 
  isSupabaseConfigured, 
  getOrCreateVisitorId, 
  getLocalMessages, 
  saveLocalMessage, 
  markLocalMessagesAsRead,
  Message,
  demoChannel,
  generateUUID
} from "../supabaseClient";

interface VisitorChatWidgetProps {
  age?: string;
  country?: string;
}

export default function VisitorChatWidget({ age, country }: VisitorChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [usingLocalFallback, setUsingLocalFallback] = useState(!isSupabaseConfigured);
  
  const visitorId = getOrCreateVisitorId();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dynamic visitor name based on progress
  const getVisitorName = () => {
    if (country && age) {
      return `Visiteur (${country}, ${age} ans)`;
    } else if (country) {
      return `Visiteur (${country})`;
    } else if (age) {
      return `Visiteur (${age} ans)`;
    }
    return `Visiteur anonyme`;
  };

  const visitorName = getVisitorName();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Mark all admin messages as read when chat is opened
      if (!usingLocalFallback && isSupabaseConfigured && supabase) {
        supabase
          .from("messages")
          .update({ is_read: true })
          .eq("visitor_id", visitorId)
          .eq("sender", "admin")
          .then(({ error }) => {
            if (error) {
              console.warn("Error updating read status, using fallback:", error);
              markLocalMessagesAsRead(visitorId, "admin");
              setUsingLocalFallback(true);
            }
          });
      } else {
        markLocalMessagesAsRead(visitorId, "admin");
      }
      setUnreadCount(0);
    }
  }, [isOpen, messages.length, usingLocalFallback]);

  // Load and Subscribe to Messages
  useEffect(() => {
    // 1. Load Initial Messages
    if (!usingLocalFallback && isSupabaseConfigured && supabase) {
      supabase
        .from("messages")
        .select("*")
        .eq("visitor_id", visitorId)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.warn("Supabase error during messages fetch, falling back to local storage:", error);
            setUsingLocalFallback(true);
            return;
          }
          if (data) {
            setMessages(data as Message[]);
          }
        });

      // Subscribe to real-time additions for this visitor
      const channel = supabase
        .channel(`chat:${visitorId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `visitor_id=eq.${visitorId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (newMsg.sender === "admin" && !isOpen) {
              setUnreadCount((c) => c + 1);
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
        const localMsgs = getLocalMessages().filter(m => m.visitor_id === visitorId);
        setMessages(localMsgs);
        
        // Count unread from admin
        if (!isOpen) {
          const unread = localMsgs.filter(m => m.sender === "admin" && !m.is_read).length;
          setUnreadCount(unread);
        }
      };

      loadLocal();

      // Listen to local storage updates
      const handleLocalMessage = (e: Event) => {
        const customEvent = e as CustomEvent<Message>;
        if (customEvent.detail && customEvent.detail.visitor_id === visitorId) {
          setMessages((prev) => {
            if (prev.some(m => m.id === customEvent.detail.id)) return prev;
            return [...prev, customEvent.detail];
          });
          if (customEvent.detail.sender === "admin" && !isOpen) {
            setUnreadCount((c) => c + 1);
          }
        }
      };

      const handleLocalUpdate = () => {
        loadLocal();
      };

      window.addEventListener("bizi_local_message", handleLocalMessage);
      window.addEventListener("bizi_local_update", handleLocalUpdate);

      // Listen to multi-tab broadcast channel
      if (demoChannel) {
        const handleBroadcast = (event: MessageEvent) => {
          if (event.data?.type === "new_message") {
            const msg = event.data.message as Message;
            if (msg.visitor_id === visitorId) {
              setMessages((prev) => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              if (msg.sender === "admin" && !isOpen) {
                setUnreadCount((c) => c + 1);
              }
            }
          } else if (event.data?.type === "messages_read" && event.data?.visitorId === visitorId) {
            loadLocal();
          }
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
  }, [visitorId, isOpen, usingLocalFallback]);

  // Welcome Auto-message if empty chat
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeTimer = setTimeout(() => {
        const welcomeMsg: Message = {
          id: generateUUID(),
          visitor_id: visitorId,
          visitor_name: visitorName,
          sender: "admin",
          text: "Salut ! Je suis Amira. Laisse-moi un message ici si tu as des questions sur le catalogue ou pour un mougouli direct ! 😉💬",
          created_at: new Date().toISOString(),
          is_read: isOpen,
        };
        if (!usingLocalFallback && isSupabaseConfigured && supabase) {
          // Send to database
          supabase
            .from("messages")
            .insert(welcomeMsg)
            .then(({ error }) => {
              if (error) {
                console.warn("Error sending welcome message, falling back to local storage:", error);
                saveLocalMessage(welcomeMsg);
                setUsingLocalFallback(true);
              }
            });
        } else {
          saveLocalMessage(welcomeMsg);
        }
      }, 3000);
      return () => clearTimeout(welcomeTimer);
    }
  }, [messages.length, visitorId, visitorName, usingLocalFallback]);

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: generateUUID(),
      visitor_id: visitorId,
      visitor_name: visitorName,
      sender: "visitor",
      text: inputText.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setInputText("");

    if (!usingLocalFallback && isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("messages").insert(newMsg);
      if (error) {
        console.warn("Erreur d'envoi Supabase, basculement en local:", error);
        saveLocalMessage(newMsg);
        setUsingLocalFallback(true);
      }
    } else {
      saveLocalMessage(newMsg);
    }
    scrollToBottom();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      <AnimatePresence>
        {/* Chat Window */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ duration: 0.2 }}
            className="mb-4 h-[480px] w-[330px] sm:w-[380px] rounded-2xl border border-slate-800 bg-[#0b141a] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#202c33] px-4 py-3.5 border-b border-slate-900/60 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-700/50 bg-slate-800">
                    <img
                      src="https://ysbiedwkakdqadxtuwab.supabase.co/storage/v1/object/public/uploads/7ecf9fc5-15b1-431a-95c7-f1b94ce68728.png"
                      alt="Amira"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#00e676] ring-2 ring-[#202c33]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#e9edef]">Amira</h3>
                  <p className="text-[11px] text-[#00a884] font-medium flex items-center gap-1">
                    En ligne
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-[#aebac1] hover:bg-white/10 hover:text-white transition duration-200"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Sub-header banner showing Demo Mode */}
            {usingLocalFallback && (
              <div className="bg-[#182229] border-b border-slate-900/50 px-3 py-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                <span>Mode Démo {isSupabaseConfigured ? "(Échec Supabase)" : "(Messages locaux)"}</span>
                {isSupabaseConfigured && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setUsingLocalFallback(false);
                    }}
                    className="underline text-emerald-400 hover:text-emerald-300 transition px-1 normal-case font-bold cursor-pointer"
                  >
                    Réessayer
                  </button>
                )}
              </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent bg-[#0b141a]">
              {messages.map((msg) => {
                const isMe = msg.sender === "visitor";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-[14px] px-3 py-2 text-xs text-[#e9edef] leading-relaxed shadow-sm break-words flex flex-col ${
                        isMe
                          ? "bg-[#005c4b] rounded-tr-none"
                          : "bg-[#202c33] rounded-tl-none"
                      }`}
                    >
                      <div className="pr-12 text-[12.5px] whitespace-pre-wrap">{msg.text}</div>
                      <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none">
                        <span className="text-[9px] text-[#8696a0] font-medium">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMe && (
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

            {/* Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-900/40 bg-[#111b21] flex items-center gap-2">
              <div className="flex-1 relative flex items-center bg-[#202c33] rounded-full px-4 py-2">
                <input
                  type="text"
                  placeholder="Écris un message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-[13px] text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] hover:bg-[#008f72] text-white disabled:opacity-40 disabled:hover:bg-[#00a884] transition-all duration-150 active:scale-90 shadow-md"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-2xl transition-all border border-rose-400/20 focus:outline-none"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <MessageSquare className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-black text-white ring-2 ring-slate-950 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
