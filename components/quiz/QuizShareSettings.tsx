"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Globe, Image, Link2, Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface QuizShareSettingsProps {
  quizId: string;
  status: string;
  ogImageUrl: string;
  onStatusChange: (status: string) => void;
  onOgImageChange: (url: string) => void;
}

export default function QuizShareSettings({
  quizId, status, ogImageUrl, onStatusChange, onOgImageChange,
}: QuizShareSettingsProps) {
  const [copied, setCopied] = useState(false);
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/q/${quizId}`
    : `/q/${quizId}`;

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Status toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Publication
          </CardTitle>
          <CardDescription>Active ou désactive l&apos;accès public à ton quiz</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={status === "active" ? "default" : "secondary"}>
                {status === "active" ? "Actif" : "Brouillon"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {status === "active"
                  ? "Ton quiz est accessible publiquement"
                  : "Ton quiz n'est visible que par toi"}
              </span>
            </div>
            <Button
              variant={status === "active" ? "outline" : "default"}
              size="sm"
              onClick={() => onStatusChange(status === "active" ? "draft" : "active")}
            >
              {status === "active" ? "Désactiver" : "Activer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Public link */}
      {quizId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Lien public
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-sm bg-muted" />
              <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" asChild className="shrink-0">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OG Image for social sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Image de partage social
          </CardTitle>
          <CardDescription>
            Image affichée quand le quiz est partagé sur les réseaux sociaux (1200x630px recommandé)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ogImageUrl && (
            <div className="rounded-lg border overflow-hidden">
              <img src={ogImageUrl} alt="OG Preview" className="w-full h-auto max-h-48 object-cover" />
            </div>
          )}
          <Input
            value={ogImageUrl}
            onChange={(e) => onOgImageChange(e.target.value)}
            placeholder="https://monsite.com/og-image.jpg"
          />
        </CardContent>
      </Card>
    </div>
  );
}
