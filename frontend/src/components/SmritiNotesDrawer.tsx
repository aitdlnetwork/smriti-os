/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 *  Classification    : PROPRIETARY & CONFIDENTIAL
 *  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Module : SmritiNotes Drawer
 *  Desc   : A global slide-out Business Intelligence Journal for offline notes.
 *           Triggered by Ctrl+N natively across all pages.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { localDB } from "@/lib/db";

interface SmritiNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function SmritiNotesDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<SmritiNote[]>([]);
  const [activeNoteContent, setActiveNoteContent] = useState("");
  const [activeNoteTitle, setActiveNoteTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load notes securely
  const loadNotes = useCallback(() => {
    if (!localDB.isInitialized) return;
    try {
      // Create table if it doesn't exist (backward compat for old IndexedDB instances)
      localDB.run(`
        CREATE TABLE IF NOT EXISTS smriti_notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          reference_type TEXT,
          reference_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const resultSet = localDB.exec(`SELECT id, title, content, created_at FROM smriti_notes ORDER BY created_at DESC`);
      const payload: SmritiNote[] = resultSet.map(row => ({
        id: row.id as string,
        title: row.title as string,
        content: (row.content as string) || "",
        created_at: row.created_at as string
      }));
      setNotes(payload);
    } catch (err) {
      console.error("[SmritiNotes] Failed to load notes.", err);
    }
  }, []);

  // Keyboard binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger on Ctrl+N
      if (e.key.toLowerCase() === "n" && e.ctrlKey) {
        e.preventDefault(); // Prevent standard browser new window
        setIsOpen((prev) => {
          if (!prev) setTimeout(() => inputRef.current?.focus(), 100);
          return !prev;
        });
      }

      // Close on Escape if not typing in textarea? 
      // Handled at the drawer level below.
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reload notes when opened
  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen, loadNotes]);

  const saveNote = async () => {
    if (!activeNoteTitle.trim() && !activeNoteContent.trim()) return;

    try {
      const id = "note-" + Date.now() + Math.floor(Math.random() * 1000);
      const finalTitle = activeNoteTitle.trim() || "Quick Note";
      
      localDB.run(
        `INSERT INTO smriti_notes (id, title, content) VALUES (?, ?, ?)`,
        [id, finalTitle, activeNoteContent]
      );
      await localDB.save();
      
      setActiveNoteTitle("");
      setActiveNoteContent("");
      loadNotes();
    } catch (err) {
      console.error("[SmritiNotes] Save error:", err);
      alert("Failed to save note.");
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      localDB.run(`DELETE FROM smriti_notes WHERE id = ?`, [id]);
      await localDB.save();
      loadNotes();
    } catch (err) {
      console.error("[SmritiNotes] Delete error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="erp-drawer-backdrop" onClick={() => setIsOpen(false)} />

      {/* Slide-out drawer */}
      <div className="erp-notes-drawer erp-drawer-open">
        <div className="erp-notes-header">
          <div className="erp-notes-title-wrap">
            <span className="erp-notes-icon">📝</span>
            <span className="erp-notes-title">SmritiNotes</span>
          </div>
          <button className="erp-notes-close" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <div className="erp-notes-editor">
          <input
            ref={inputRef}
            className="erp-notes-input"
            type="text"
            placeholder="Note Title (Optional)..."
            value={activeNoteTitle}
            onChange={(e) => setActiveNoteTitle(e.target.value)}
          />
          <textarea
            className="erp-notes-textarea"
            placeholder="Type your business journal entry here..."
            value={activeNoteContent}
            onChange={(e) => setActiveNoteContent(e.target.value)}
          />
          <div className="erp-notes-toolbar">
            <span className="erp-notes-hint">Ctrl+N to close</span>
            <button className="erp-notes-save" onClick={saveNote}>Save Note</button>
          </div>
        </div>

        <div className="erp-notes-list">
          {notes.length === 0 ? (
            <div className="erp-notes-empty">No offline notes yet.</div>
          ) : (
            notes.map(note => (
              <div key={note.id} className="erp-note-card">
                <div className="erp-note-card-header">
                  <span className="erp-note-card-title">{note.title}</span>
                  <button className="erp-note-delete" onClick={() => deleteNote(note.id)}>🗑️</button>
                </div>
                <div className="erp-note-card-body">{note.content}</div>
                <div className="erp-note-card-time">{new Date(note.created_at).toLocaleString("en-IN")}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
