import MeetingPageClient from "./client";

export default async function Page({ params }: any) {
  const { id } = await params;
  return <MeetingPageClient id={id} />;
}
