"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { SecretList } from "@/components/SecretList";

export default function SecretsPage() {
  return (
    <ContentLayout>
      <TopBar />
      <div className="py-4">
        <h2 className="text-2xl font-thin mb-4">
          Manage your{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            secrets
          </span>
        </h2>
        <SecretList />
      </div>
    </ContentLayout>
  );
}
