// meeting-button.tsx
"use client";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function CreateMeetingButton() {
  const router = useRouter();

  const handleCreateMeeting = () => {
    const meetingId = uuidv4();
    router.push(`/meeting/${meetingId}`);
  };

  return (
    <button
      onClick={handleCreateMeeting}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      Join Class
    </button>
  );
}
