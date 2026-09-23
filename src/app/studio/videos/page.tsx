import { Card, EmptyState, PageHeader } from "@/components/ui/base";
import { listVideos } from "@/lib/api/resources";
import { AddVideo } from "./add-video";
import { VideoCard } from "./video-card";

export const metadata = { title: "Videos · Portfolio Admin" };

export default async function VideosPage() {
  const videos = await listVideos({ includeInactive: true });

  return (
    <>
      <PageHeader
        title="Videos"
        description="YouTube performances shown on the public site."
        action={<AddVideo />}
      />

      {videos.length === 0 ? (
        <Card>
          <EmptyState
            title="No videos yet"
            description="Paste a YouTube link — the title, duration and thumbnail are fetched automatically."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </>
  );
}
