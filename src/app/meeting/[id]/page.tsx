import MeetingPageClient from "./MeetingPageClient";

export default function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { role?: string };
}) {
  const { id } = params;
  const role = searchParams?.role || "guest";

  return <MeetingPageClient id={id} role={role} />;
}
