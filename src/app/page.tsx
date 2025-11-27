"use client";
import CreateMeetingButton from "@/components/meeting-button";
import Image from "next/image";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    fetch("/api/socket");
  }, []);

  return (
    <>
      <CreateMeetingButton />
    </>
  );
}
