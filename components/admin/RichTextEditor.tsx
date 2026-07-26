"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Link2,
  Eraser,
  ImagePlus,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FIGURE_OPTIONS } from "@/components/figures/registry";

/**
 * Editeur WYSIWYG minimal base sur contentEditable + execCommand.
 * Produit du HTML compatible avec le rendu .fq-rich (h2/h3, listes,
 * gras, liens) et permet d'inserer un schema via un shortcode
 * [[figure:cle]]. Volontairement simple et sans dependance lourde.
 *
 * contentEditable non controle : on initialise le HTML une seule fois au
 * montage, puis on remonte les changements via onChange (sinon le curseur
 * sauterait a chaque frappe).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  videoSlots = 0,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Nombre de boutons d'insertion [[video:N]] à afficher (0 = aucun).
   *  Ne l'active que sur les champs dont le rendu résout ces shortcodes
   *  (aujourd'hui : le contenu du jour). */
  videoSlots?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || "";
    // Initialisation au montage uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    emit();
  }

  function insertLink() {
    const url = window.prompt("Adresse du lien (https://...)");
    if (!url) return;
    exec("createLink", url);
  }

  function insertFigure(key: string) {
    if (!key) return;
    ref.current?.focus();
    document.execCommand("insertHTML", false, `<p>[[figure:${key}]]</p>`);
    emit();
  }

  function insertVideo(slot: number) {
    ref.current?.focus();
    // Même mécanique que les figures : un shortcode dans son propre
    // paragraphe, résolu au rendu par la page du jour (lecteur + bandeau
    // titré). L'admin peut le déplacer/supprimer comme du texte.
    document.execCommand("insertHTML", false, `<p>[[video:${slot}]]</p>`);
    emit();
  }

  const Btn = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      // onMouseDown preventDefault : garde la selection de texte active
      // quand on clique le bouton.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4"
    >
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-input">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-muted/50 px-1.5 py-1">
        <Btn title="Gras" onClick={() => exec("bold")}>
          <Bold />
        </Btn>
        <Btn title="Italique" onClick={() => exec("italic")}>
          <Italic />
        </Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn title="Titre" onClick={() => exec("formatBlock", "H2")}>
          <Heading2 />
        </Btn>
        <Btn title="Sous-titre" onClick={() => exec("formatBlock", "H3")}>
          <Heading3 />
        </Btn>
        <Btn title="Paragraphe" onClick={() => exec("formatBlock", "P")}>
          <Pilcrow />
        </Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn title="Liste à puces" onClick={() => exec("insertUnorderedList")}>
          <List />
        </Btn>
        <Btn title="Liste numérotée" onClick={() => exec("insertOrderedList")}>
          <ListOrdered />
        </Btn>
        <Btn title="Lien" onClick={insertLink}>
          <Link2 />
        </Btn>
        <Btn title="Effacer la mise en forme" onClick={() => exec("removeFormat")}>
          <Eraser />
        </Btn>
        {videoSlots > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <div className="flex flex-wrap items-center gap-1">
              <Film className="size-4 text-muted-foreground" />
              {Array.from({ length: videoSlots }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  title={`Insérer la vidéo ${n} à cet endroit du texte`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertVideo(n)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Vidéo {n}
                </button>
              ))}
            </div>
          </>
        )}
        <span className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          <ImagePlus className="size-4 text-muted-foreground" />
          <select
            aria-label="Insérer un schéma"
            defaultValue=""
            onChange={(e) => {
              insertFigure(e.target.value);
              e.target.value = "";
            }}
            className="h-7 rounded-md border border-input bg-background px-1.5 text-xs outline-none"
          >
            <option value="" disabled>
              Insérer un schéma
            </option>
            {FIGURE_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className={cn(
          "fq-rich min-h-32 max-h-[28rem] overflow-y-auto px-3 py-2 text-sm outline-none",
          "empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
        )}
      />
    </div>
  );
}
