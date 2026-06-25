import Link from "next/link";

interface FooterProps {
  translations: {
    tagline: string;
    product: string;
    company: string;
    legal: string;
    links: {
      features: string;
      pricing: string;
      download: string;
      about: string;
      blog: string;
      careers: string;
      privacy: string;
      terms: string;
      imprint: string;
    };
    copyright: string;
  };
}

export function Footer({ translations: t }: FooterProps) {
  // Map link labels to real on-page sections / future routes.
  // Anchors stay on the homepage (already exists). External routes are flagged
  // for later but don't 404 because we route them to existing content.
  const productLinks = [
    { label: t.links.features, href: "#features" },
    { label: t.links.pricing, href: "#faq" }, // pricing answered in FAQ for now
    { label: t.links.download, href: "#waitlist" }, // pre-launch CTA
  ];

  const companyLinks = [
    { label: t.links.about, href: "#features" },
    { label: t.links.blog, href: "#testimonials" },
    { label: t.links.careers, href: "mailto:careers@fayv.app" },
  ];

  const legalLinks = [
    { label: t.links.privacy, href: "/privacy" },
    { label: t.links.terms, href: "/terms" },
    { label: t.links.imprint, href: "/imprint" },
  ];

  return (
    <footer className="bg-background border-t border-card-border">
      <div className="site-container py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <span className="font-serif text-3xl font-medium text-foreground tracking-[-0.02em]">
              FAYV
            </span>
            <p className="text-sm text-muted mt-4 leading-relaxed max-w-[280px]">{t.tagline}</p>
            <div className="flex items-center gap-4 mt-8">
              <a
                href="https://instagram.com/fayvapp"
                rel="noopener noreferrer"
                target="_blank"
                className="text-muted hover:text-foreground transition-colors text-sm"
              >
                Instagram
              </a>
              <span className="text-card-border" aria-hidden>·</span>
              <a
                href="https://tiktok.com/@fayvapp"
                rel="noopener noreferrer"
                target="_blank"
                className="text-muted hover:text-foreground transition-colors text-sm"
              >
                TikTok
              </a>
              <span className="text-card-border" aria-hidden>·</span>
              <a
                href="https://x.com/fayvapp"
                rel="noopener noreferrer"
                target="_blank"
                className="text-muted hover:text-foreground transition-colors text-sm"
              >
                X
              </a>
            </div>
          </div>

          {/* Product */}
          <FooterColumn title={t.product} links={productLinks} />

          {/* Company */}
          <FooterColumn title={t.company} links={companyLinks} />

          {/* Legal */}
          <FooterColumn title={t.legal} links={legalLinks} />
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} {t.copyright}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-px bg-accent" />
            <p className="text-[10px] tracking-[0.15em] text-muted/40 uppercase">Fashion meets AI</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-[11px] font-medium tracking-[0.2em] text-foreground uppercase mb-5">
        {title}
      </h4>
      <ul className="space-y-3">
        {links.map((link) => {
          const isExternal = link.href.startsWith("http") || link.href.startsWith("mailto");
          const isAnchor = link.href.startsWith("#");
          if (isExternal || isAnchor) {
            return (
              <li key={link.label}>
                <a
                  href={link.href}
                  {...(isExternal && link.href.startsWith("http")
                    ? { rel: "noopener noreferrer", target: "_blank" }
                    : {})}
                  className="text-sm text-muted hover:text-foreground transition-colors duration-300"
                >
                  {link.label}
                </a>
              </li>
            );
          }
          return (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-sm text-muted hover:text-foreground transition-colors duration-300"
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
