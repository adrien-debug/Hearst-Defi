// `/` — entry point. Authentication is email/password and the canonical
// sign-in screen lives at `/login` (the route the proxy redirects to). We send
// the bare root there so there is a single login surface. Authenticated users
// navigate on to `/portfolio` from the app shell.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/login");
}
