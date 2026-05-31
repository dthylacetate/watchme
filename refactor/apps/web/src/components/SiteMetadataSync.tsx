"use client";

import { useEffect } from "react";
import type { SiteConfig } from "@watchme/shared";

export default function SiteMetadataSync({ config }: { config: SiteConfig }) {
  useEffect(() => {
    document.title = config.siteTitle;

    let icon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = config.siteFavicon;
  }, [config]);

  return null;
}
