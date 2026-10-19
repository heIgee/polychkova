export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/account", "/account/:path*", "/lists", "/lists/:path*"],
};
