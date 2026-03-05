"use client";
import CookieConsent from "react-cookie-consent";

export const CookieConsentComponent = () => {

  return (
    <div id="cookie_constent" className="w-full">
        <CookieConsent
        location="bottom"
        buttonText="Accept All"
        declineButtonText="Decline"
        enableDeclineButton
        cookieName="yourAppCookieConsent"
        containerClasses="bg-card text-card-foreground"
        buttonClasses="bg-primary text-primary-foreground text-sm"
        declineButtonClasses="bg-muted text-muted-foreground text-sm"
        expires={365}  // Number of days before the cookie expires
        onAccept={() => {
          // Add functionality when user accepts cookies
          
        }}
        onDecline={() => {
          // Add functionality when user declines cookies
        }}
      >
        This website uses cookies to enhance your experience. By using our website, you consent to the use of cookies. 
        You can read more in our <a href="/privacy-policy">privacy policy</a>.
      </CookieConsent>
    </div>
  );
};
