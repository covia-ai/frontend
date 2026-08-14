"use client";
import CookieConsent from "react-cookie-consent";

// Google Consent Mode v2: GTM/GA read these dataLayer signals to decide
// whether analytics/ad cookies may actually be set. Without this push,
// accepting or declining the banner has no effect on tracking.
function pushConsent(granted: boolean) {
  window.dataLayer = window.dataLayer || [];
  const consentWindow = window as Window & {
    gtag?: (...args: unknown[]) => void;
  };
  consentWindow.gtag?.(
    "consent",
    "update",
    {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
    },
  );
  window.dataLayer.push({
    event: "consent_update",
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
  });
}

export const CookieConsentComponent = () => {

  return (
    <div id="cookie_constent" className="w-full">
        <CookieConsent
        location="bottom"
        buttonText="Accept All"
        declineButtonText="Decline"
        enableDeclineButton
        disableButtonStyles
        cookieName="yourAppCookieConsent"
        containerClasses="bg-card text-card-foreground"
        buttonClasses="rounded-md px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
        declineButtonClasses="rounded-md px-4 py-2 mr-2 bg-muted text-muted-foreground text-sm"
        expires={365}  // Number of days before the cookie expires
        onAccept={() => pushConsent(true)}
        onDecline={() => pushConsent(false)}
      >
        This website uses cookies to enhance your experience. By using our website, you consent to the use of cookies.
        You can read more in our{" "}
        <a href="/privacypolicy" className="text-primary underline underline-offset-2 hover:text-primary/80">
          privacy policy
        </a>
        .
      </CookieConsent>
    </div>
  );
};
