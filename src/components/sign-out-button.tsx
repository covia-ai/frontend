"use client";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export const SignOutButton = () => {
  return (
    <Button 
      onClick={() => signOut({ callbackUrl: "/" })}
      variant="outline"
    >
      Sign Out
    </Button>
  );
};
