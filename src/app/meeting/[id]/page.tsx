import MeetingPageClient from "./MeetingPageClient";

export default async function Page(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const { id } = await props.params;
  const { role = "guest" } = await props.searchParams;

  return <MeetingPageClient id={id} role={role} />;
}
