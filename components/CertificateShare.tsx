"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5.001zM3 9h4v12H3zM10 9h3.8v1.71h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.54 4.78 5.85V21h-4v-5.5c0-1.31-.03-3-1.9-3-1.9 0-2.2 1.43-2.2 2.9V21h-4z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

/**
 * Boutons de partage du certificat (page publique). Liens d'intention
 * vers les reseaux + copie du lien + telechargement de l'image.
 */
export function CertificateShare({
  url,
  imageUrl,
}: {
  url: string;
  imageUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareText =
    "Je viens d'obtenir mon Certificat de fin de formation de L'Atelier du Quiz.";
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const x = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-muted-foreground">
        Partage ton certificat
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={linkedin} target="_blank" rel="noopener noreferrer">
            <LinkedinIcon />
            LinkedIn
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={facebook} target="_blank" rel="noopener noreferrer">
            <FacebookIcon />
            Facebook
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={x} target="_blank" rel="noopener noreferrer">
            {/* X (ex-Twitter) */}
            <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X
          </a>
        </Button>
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copié" : "Copier le lien"}
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="size-4" />
            Télécharger
          </a>
        </Button>
      </div>
    </div>
  );
}
