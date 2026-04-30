"use client";

// Inline rich-text editor used everywhere in the quiz editor.
// Click-to-edit with a floating toolbar: bold / italic / underline / alignment
// (left / center / right) / bullet list / numbered list / link / image.
// Stores sanitized HTML. Read-only renders also go through the same sanitizer
// to keep the public page XSS-safe.
//
// `singleLine`:
//   - Enter commits the edit instead of inserting a newline
//   - Block-level tools (lists) are hidden (they don't make sense on a one-line
//     field) — alignment is kept because it's a purely visual toggle that works
//     on a single line too.

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered,
  Link as LinkIcon, Image as ImageIcon, Pencil,
  Sparkles, Loader2,
} from "lucide-react";
import { sanitizeRichText, isSafeUrl } from "@/lib/richText";
import { QuizVarInserter, type QuizVarFlags } from "@/components/quiz/QuizVarInserter";

interface RichTextEditProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  /** Single-line behaviour: Enter saves, block formatting disabled. */
  singleLine?: boolean;
  /**
   * When provided, a ✨ button is shown in the display mode. Clicking it
   * sends the current plain-text value to the genderize API and replaces
   * the field with the folded `{m|f|x}` variant. Formatting is lost.
   */
  onGenderize?: (plainText: string) => Promise<string | null>;
  /**
   * Personalization placeholders the user can insert at the caret. Driven
   * by the quiz's ask_first_name / ask_gender flags. When provided and at
   * least one is true, "+ {name}" / "+ {m|f|x}" chips show up next to
   * the formatting toolbar in edit mode.
   */
  availableVars?: QuizVarFlags;
  /**
   * Optional transform applied to `value` ONLY in display mode (not while
   * editing). Used by the quiz editor to substitute {name} / {m|f|x}
   * placeholders with a demo first name so the creator sees what real
   * visitors will see, while still being able to edit the raw template by
   * clicking the field. Identity passthrough when omitted.
   */
  previewTransform?: (value: string) => string;
}

export function RichTextEdit({
  value, onChange, className, placeholder, style, singleLine, onGenderize, availableVars,
  previewTransform,
}: RichTextEditProps) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [genderizing, setGenderizing] = useState(false);

  const handleGenderize = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onGenderize || genderizing) return;
    const plain = stripTagsQuick(value);
    if (!plain) return;
    setGenderizing(true);
    try {
      const folded = await onGenderize(plain);
      if (folded) onChange(folded);
    } finally {
      setGenderizing(false);
    }
  }, [onGenderize, onChange, value, genderizing]);

  useEffect(() => {
    if (!editing && ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = sanitizeRichText(value);
    }
  }, [value, editing]);

  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.innerHTML = sanitizeRichText(value);
    ref.current.focus();
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (sel && typeof document !== "undefined") {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const exec = useCallback((cmd: string, arg?: string) => {
    if (typeof document === "undefined") return;
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
  }, []);

  const commit = useCallback(() => {
    if (!ref.current) return;
    const clean = sanitizeRichText(ref.current.innerHTML);
    if (clean !== value) onChange(clean);
    setEditing(false);
  }, [onChange, value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (singleLine && e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  const onInsertLink = () => {
    const url = window.prompt(t("rteLinkPrompt"));
    if (!url) return;
    if (!isSafeUrl(url)) {
      window.alert(t("rteLinkInvalid"));
      return;
    }
    exec("createLink", url);
    const el = ref.current;
    if (el) {
      el.querySelectorAll("a").forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
    }
  };

  const onInsertImage = () => {
    const url = window.prompt(t("rteImagePrompt"));
    if (!url) return;
    if (!isSafeUrl(url)) {
      window.alert(t("rteUrlInvalid"));
      return;
    }
    exec("insertImage", url);
    const el = ref.current;
    if (el) {
      el.querySelectorAll("img").forEach((img) => {
        img.style.maxWidth = "100%";
        img.style.height = "auto";
      });
    }
  };

  const baseCls = `${className || ""} cursor-text rounded-lg px-2 py-1 transition-all min-h-[1.2em]`;
  const hasVars = availableVars && (availableVars.name || availableVars.gender);

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border bg-background p-1 shadow-sm sticky top-2 z-20">
          <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} title={t("rteBold")}><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} title={t("rteItalic")}><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} title={t("rteUnderline")}><UnderlineIcon className="w-3.5 h-3.5" /></ToolbarBtn>
          <span className="w-px h-4 bg-border mx-0.5" />
          <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }} title={t("rteAlignLeft")}><AlignLeft className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }} title={t("rteAlignCenter")}><AlignCenter className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }} title={t("rteAlignRight")}><AlignRight className="w-3.5 h-3.5" /></ToolbarBtn>
          {!singleLine && <>
            <span className="w-px h-4 bg-border mx-0.5" />
            <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} title={t("rteBulletList")}><List className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} title={t("rteNumberedList")}><ListOrdered className="w-3.5 h-3.5" /></ToolbarBtn>
          </>}
          <span className="w-px h-4 bg-border mx-0.5" />
          <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); onInsertLink(); }} title={t("rteInsertLink")}><LinkIcon className="w-3.5 h-3.5" /></ToolbarBtn>
          {!singleLine && <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); onInsertImage(); }} title={t("rteInsertImage")}><ImageIcon className="w-3.5 h-3.5" /></ToolbarBtn>}
          {hasVars && (
            <>
              <span className="w-px h-4 bg-border mx-0.5" />
              <QuizVarInserter
                vars={availableVars!}
                compact
                // execCommand keeps the caret position inside the
                // contentEditable — exactly what we need to drop the
                // placeholder where the cursor sits.
                onInsert={(placeholder) => exec("insertText", placeholder)}
              />
            </>
          )}
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={commit}
          onKeyDown={onKeyDown}
          className={`${baseCls} w-full bg-white/90 border-2 border-primary/40 outline-none`}
          style={style}
          data-placeholder={placeholder}
        />
      </div>
    );
  }

  const isEmpty = !value || stripTagsQuick(value).length === 0;
  return (
    <div
      onClick={() => setEditing(true)}
      style={style}
      className={`${baseCls} hover:ring-2 hover:ring-primary/20 hover:bg-primary/5 group relative`}
    >
      {isEmpty ? (
        <span className="opacity-40 italic">{placeholder}</span>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(previewTransform ? previewTransform(value) : value) }} />
      )}
      <Pencil className="absolute top-1 right-1 w-3 h-3 text-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      {onGenderize && !isEmpty && (
        <button
          type="button"
          onClick={handleGenderize}
          disabled={genderizing}
          title="Générer les variantes de genre (Il / Elle / Iel)"
          className="absolute top-1 right-6 p-0.5 text-primary/30 opacity-0 group-hover:opacity-100 hover:text-primary disabled:opacity-100 transition-opacity"
        >
          {genderizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

function stripTagsQuick(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function ToolbarBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const { className, children, ...rest } = props;
  return (
    <button
      type="button"
      className={`p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
