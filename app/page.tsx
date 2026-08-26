// app/page.tsx
import { redirect } from "next/navigation";

// Redirect root to the demo brand shop
export default function RootPage() {
  redirect("/forge-collective");
}
