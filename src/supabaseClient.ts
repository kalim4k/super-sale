/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

// Retrieve Supabase credentials from environment variables safely
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = supabaseUrl.trim() !== "" && supabaseAnonKey.trim() !== "";

// Initialize Supabase client if configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Unique Visitor ID generation for tracking chats
export function getOrCreateVisitorId(): string {
  let id = localStorage.getItem("bizi_visitor_id");
  if (!id) {
    id = "vis_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("bizi_visitor_id", id);
  }
  return id;
}

// Generate valid RFC4122 v4 UUIDs for Supabase compatibility
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Local Fallback Event Channel for Demo Mode (multi-tab support)
export const demoChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("bizi_chat_fallback")
  : null;

export interface Message {
  id: string;
  visitor_id: string;
  visitor_name: string;
  sender: "visitor" | "admin";
  text: string;
  created_at: string;
  is_read: boolean;
}

// Save/Get local messages helper
export function getLocalMessages(): Message[] {
  try {
    const data = localStorage.getItem("bizi_messages");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalMessage(msg: Message) {
  const current = getLocalMessages();
  current.push(msg);
  localStorage.setItem("bizi_messages", JSON.stringify(current));
  
  // Dispatch locally in current window
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bizi_local_message", { detail: msg }));
  }
  // Broadcast to other tabs
  if (demoChannel) {
    demoChannel.postMessage({ type: "new_message", message: msg });
  }
}

export function markLocalMessagesAsRead(visitorId: string, senderToMark: "visitor" | "admin") {
  const current = getLocalMessages();
  let modified = false;
  const updated = current.map((msg) => {
    if (msg.visitor_id === visitorId && msg.sender === senderToMark && !msg.is_read) {
      modified = true;
      return { ...msg, is_read: true };
    }
    return msg;
  });
  if (modified) {
    localStorage.setItem("bizi_messages", JSON.stringify(updated));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bizi_local_update"));
    }
    if (demoChannel) {
      demoChannel.postMessage({ type: "messages_read", visitorId, sender: senderToMark });
    }
  }
}
