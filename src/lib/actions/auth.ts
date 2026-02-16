"use server";

import { auth, signIn, signOut } from "@/auth";
import { gtmEvent } from "../utils";

export const login = async (providerName:string) => {
  gtmEvent.buttonClick('Sign Up', providerName)
  await signIn(providerName, { redirectTo: "/operations" });
};

export const logout = async () => {
  gtmEvent.buttonClick('Sign Out', 'NA')
  await signOut({ redirectTo: "/" });
};

export const getUserEmail = async() => {
  const session = await auth();
  return session?.user?.email;
}