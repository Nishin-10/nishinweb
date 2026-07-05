import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RoomClient } from "./room-client";

export const metadata: Metadata = { title: "Game room" };

export default async function RoomPage(props: PageProps<"/play/room/[code]">) {
  const { code } = await props.params;
  return (
    <div>
      <PageHeader
        title="Game room"
        description="Live multiplayer. Everyone who opens this link joins the same table."
      />
      <RoomClient code={code.toUpperCase()} />
    </div>
  );
}
