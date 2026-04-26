import { redirect } from "next/navigation";

export default function Home() {
  // Middleware handles auth redirect; this just lands somewhere sensible.
  redirect("/dashboard");
}
