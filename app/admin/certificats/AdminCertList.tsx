"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Download, ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type AdminCert = {
  id: string;
  token: string;
  number: string;
  name: string;
  date: string;
};

export function AdminCertList({
  certs,
  appUrl,
}: {
  certs: AdminCert[];
  appUrl: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      toast.success("Lien copié.");
      setTimeout(() => setCopiedId((c) => (c === key ? null : c)), 2000);
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  }

  if (certs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="size-8 opacity-40" />
          <p>
            Les certificats des élèves apparaîtront ici dès qu'ils termineront
            l'Atelier.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {certs.map((c) => {
        const imageUrl = `${appUrl}/cert/${c.token}/image`;
        const downloadUrl = `${imageUrl}?dl=1`;
        const publicUrl = `${appUrl}/cert/${c.token}`;
        return (
          <Card key={c.id} className="overflow-hidden">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/cert/${c.token}/image?w=700`}
                alt={`Certificat de ${c.name}`}
                className="w-full h-auto border-b border-border"
                loading="lazy"
              />
            </a>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex flex-col gap-0.5">
                <p className="truncate font-medium" title={c.name}>
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.number ? `N° ${c.number} · ` : ""}
                  {c.date}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(imageUrl, `${c.id}-img`)}
                >
                  {copiedId === `${c.id}-img` ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  Lien image
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="size-4" />
                    Télécharger
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(publicUrl, `${c.id}-pub`)}
                >
                  {copiedId === `${c.id}-pub` ? (
                    <Check className="size-4" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                  Lien public
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
