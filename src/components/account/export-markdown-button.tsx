"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** F-30 (Could): downloads the account summary (built on the server as Markdown text) as a .md file. */
export function ExportMarkdownButton({ markdown, fileName }: { markdown: string; fileName: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      <DownloadIcon />
      Export summary (.md)
    </Button>
  );
}
