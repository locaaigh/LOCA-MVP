import { redirect } from "next/navigation";

// Por ahora el backoffice tiene una sola sección.
export default function AdminIndexPage() {
  redirect("/admin/onboarding-fields");
}
