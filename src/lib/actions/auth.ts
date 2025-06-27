"use server";

import { auth, signIn, signOut } from "@/auth";

export const login = async (providerName:string) => {
  await signIn(providerName, { redirectTo: "/operations" });
};

export const logout = async () => {
  await signOut({ redirectTo: "/operations" });
};

export const getUserEmail = async() => {
  const session = await auth();
  return session?.user?.email;
}