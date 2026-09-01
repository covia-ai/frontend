import type { IconType } from "react-icons";
import { FaSlack } from "react-icons/fa";
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
} from "react-icons/si";
import type { ConnectionService } from "@/config/connections";

/**
 * The service's real brand glyph, keyed by connection id. Twilio and SendGrid
 * have no glyph in react-icons (removed from Simple Icons on trademark request),
 * so they fall back to the initials badge — see {@link ConnectionLogo}.
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
};

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
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg font-bold text-white"
      style={{ backgroundColor: service.color, width: size, height: size, fontSize: size * 0.32 }}
      aria-hidden
    >
      {Icon ? <Icon size={size * 0.58} /> : service.initials}
    </span>
  );
}
