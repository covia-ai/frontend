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
        style={{ background: "#e9e9e9", color: "#000" }}
        buttonStyle={{ backgroundColor: "#ffffff", color: "#000", fontSize: "14px" }}
        declineButtonStyle={{ backgroundColor: "#00000", color: "#FFF", fontSize: "14px" }}
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
