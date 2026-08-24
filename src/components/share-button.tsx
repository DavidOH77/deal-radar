"use client";

import { useState } from "react";
import { MaterialIcon } from "./material-icon";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="secondary-button" type="button" onClick={() => void share()}>
      <MaterialIcon name="share" size={18} /> {copied ? "링크 복사됨" : "공유"}
    </button>
  );
}
