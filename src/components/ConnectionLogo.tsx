import type { IconType } from "react-icons";
import { FaSlack } from "react-icons/fa";
import { TbBrandTwilio, TbBrandMonday } from "react-icons/tb";
import {
  SiGithub,
  SiNotion,
  SiJira,
  SiLinear,
  SiStripe,
  SiAirtable,
  SiDiscord,
  SiAsana,
  SiIntercom,
  SiSentry,
  SiHubspot,
  SiTelegram,
  SiGitlab,
  SiClickup,
  SiCalendly,
  SiPagerduty,
} from "react-icons/si";
import type { ConnectionService } from "@/config/connections";
import { SendGridGlyph } from "@/components/brand-glyphs";

/**
 * The service's real brand glyph, keyed by connection id. Most come from
 * react-icons; SendGrid was removed from Simple Icons on trademark request and
 * has no glyph in any react-icons set, so it uses a local inline mark. Anything
 * without an entry falls back to the initials badge — see {@link ConnectionLogo}.
 */
const BRAND_ICON: Record<string, IconType> = {
  github: SiGithub,
  notion: SiNotion,
  slack: FaSlack,
  jira: SiJira,
  linear: SiLinear,
  stripe: SiStripe,
  airtable: SiAirtable,
  discord: SiDiscord,
  asana: SiAsana,
  intercom: SiIntercom,
  sentry: SiSentry,
  hubspot: SiHubspot,
  telegram: SiTelegram,
  twilio: TbBrandTwilio,
  sendgrid: SendGridGlyph,
  gitlab: SiGitlab,
  clickup: SiClickup,
  calendly: SiCalendly,
  monday: TbBrandMonday,
  pagerduty: SiPagerduty,
};

/** Ids whose glyph carries its own colours, so it needs a light tile rather
 *  than the white-on-brand treatment the monochrome marks get. */
const MULTICOLOUR_GLYPHS = new Set(["sendgrid"]);

/** A connector's logo: the brand glyph on its brand-colour tile, initials if we
 *  have no glyph for it. One source of truth for every place a badge appears. */
export function ConnectionLogo({
  service,
  size = 36,
}: {
  service: ConnectionService;
  size?: number;
}) {
  const Icon = BRAND_ICON[service.id];
  const multicolour = MULTICOLOUR_GLYPHS.has(service.id);
  return (
    <span
      className={
        "flex shrink-0 items-center justify-center rounded-lg font-bold " +
        (multicolour ? "border bg-white text-foreground" : "text-white")
      }
      style={{
        backgroundColor: multicolour ? undefined : service.color,
        width: size,
        height: size,
        fontSize: size * 0.32,
      }}
      aria-hidden
    >
      {Icon ? <Icon size={size * 0.58} /> : service.initials}
    </span>
  );
}
