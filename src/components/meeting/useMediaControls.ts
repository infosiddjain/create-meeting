// useMediaControls.ts
import { useState } from "react";

export function useMediaControls(localStreamRef: any, peersRef: any) {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  const toggleMic = () => {
    const audio = localStreamRef.current?.getAudioTracks()[0];
    if (audio) {
      audio.enabled = !audio.enabled;
      setMicOn(audio.enabled);
    }
  };

  const toggleVideo = () => {
    const video = localStreamRef.current?.getVideoTracks()[0];
    if (video) {
      video.enabled = !video.enabled;
      setVideoOn(video.enabled);
    }
  };

  const shareScreen = async () => {
    const screen = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const screenTrack = screen.getVideoTracks()[0];

    Object.values(peersRef.current).forEach((pc: any) => {
      const sender = pc.getSenders().find((s: any) => s.track.kind === "video");
      sender.replaceTrack(screenTrack);
    });

    screenTrack.onended = () => {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peersRef.current).forEach((pc: any) => {
        const sender = pc
          .getSenders()
          .find((s: any) => s.track.kind === "video");
        sender.replaceTrack(camTrack);
      });
    };
  };

  return { micOn, videoOn, toggleMic, toggleVideo, shareScreen };
}
