import { redirect } from "next/navigation";

export default function PriceChangesPage() {
  redirect("/my-list?tab=changes");
}
