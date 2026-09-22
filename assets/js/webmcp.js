// WebMCP progressive enhancement.
// No-op for normal visitors: only lights up if an agentic browser has
// injected navigator.modelContext. No polyfill, no CDN, no network cost.

(function () {
  const mc = navigator.modelContext;
  if (!mc) return;

  const canRegister = typeof mc.registerTool === 'function';
  const canContext = typeof mc.provideContext === 'function';
  if (!canRegister && !canContext) return;

  // Editable description of the site + its owner and links.
  const SITE = {
    name: "Mike ;D",
    owner: "Michael Frye",
    summary: "Personal site of Michael Frye — game dev and tinkerer. " +
      "Home of a spinning-logo mini-game, an RSS feed, and a few web tools.",
    links: {
      github: "https://github.com/MikeSemicolonD",
      linkedin: "https://www.linkedin.com/in/michael-frye-683a9917b/",
      itchLittleGear: "https://littlegearstudios.itch.io",
      itchProjectPiper: "https://program-canaan.itch.io/pied-piper-battle-system",
      roomTempVizTool: "https://mikesemicolond.github.io/Air-Room-Viz-Tool/",
      xaiExportViewer: "https://mikesemicolond.github.io/static-xAI-data-viewer/"
    }
  };

  // Standard MCP text result shape.
  const text = (value) => ({
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }]
  });

  const tools = [
    {
      name: "get_site_info",
      description: "Get a summary of this site (Mike ;D), its owner, and relevant links.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => text(SITE)
    },
    {
      name: "list_posts",
      description: "List recent posts/updates published on the site.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        try {
          const res = await fetch("posts.json", { cache: "no-store" });
          if (!res.ok) return text("Could not load posts (HTTP " + res.status + ").");
          const posts = await res.json();
          const trimmed = (Array.isArray(posts) ? posts : []).map((p) => ({
            title: p.title,
            link: p.link,
            date: p.pubDate,
            description: (p.description || "").trim()
          }));
          return text(trimmed);
        } catch (e) {
          return text("Could not load posts: " + e.message);
        }
      }
    },
    {
      name: "get_theme",
      description: "Get the current background theme mode: 'auto', 'light', or 'dark'.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () =>
        text(typeof getThemeMode === "function" ? getThemeMode() : "unknown")
    },
    {
      name: "set_theme",
      description: "Set the background theme mode. 'auto' follows time of day.",
      inputSchema: {
        type: "object",
        properties: { mode: { type: "string", enum: ["auto", "light", "dark"] } },
        required: ["mode"],
        additionalProperties: false
      },
      execute: async (args) => {
        const mode = args && args.mode;
        if (typeof setTheme !== "function") return text("Theme control unavailable on this page.");
        const applied = setTheme(mode);
        if (applied !== mode) return text("Invalid mode '" + mode + "'. Use auto, light, or dark.");
        return text("Theme set to '" + applied + "'.");
      }
    }
  ];

  // Prefer provideContext when present; register tools individually otherwise.
  if (canContext) {
    try {
      mc.provideContext({ tools });
      return;
    } catch (e) {
      // Fall through to registerTool if provideContext rejects the payload.
    }
  }

  if (canRegister) {
    for (const tool of tools) {
      try { mc.registerTool(tool); } catch (e) {}
    }
  }
})();
