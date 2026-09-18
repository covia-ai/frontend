import { LegalPage } from "@/components/LegalPage";
import { TERMS_OF_SERVICE_MD } from "@/content/legal/terms";

export default function TermsPage() {
  return <LegalPage text="Terms of" highlight="service" markdown={TERMS_OF_SERVICE_MD} />;
}
