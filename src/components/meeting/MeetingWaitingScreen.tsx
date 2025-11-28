// MeetingWaitingScreen.tsx

export default function MeetingWaitingScreen({ id }: { id: string }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="text-2xl font-semibold mb-2">
        Waiting for host to let you in...
      </div>
      <div className="text-sm text-gray-300 mb-4">
        Host will approve your request shortly.
      </div>
      <div className="text-xs text-gray-500">Room: {id}</div>
    </div>
  );
}
