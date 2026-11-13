import { Container } from "@/components/layout";
import { Hero, RightNow, LatestPosts, FeaturedProject, Voices } from "@/components/home";
import { getHomeVoices } from "@/lib/voices";
import { getCurrentReads } from "@/lib/currentReads";
import { getLatestPosts } from "@/lib/posts";
import { getFeaturedProjects } from "@/lib/projects";

export default function HomePage() {
  const latestPosts = getLatestPosts(3);
  const featuredProjects = getFeaturedProjects();
  const featuredProject = featuredProjects[0];
  const currentReads = getCurrentReads();
  const homeVoices = getHomeVoices();

  return (
    <Container>
      <Hero />

      {featuredProject && <FeaturedProject project={featuredProject} />}

      <LatestPosts posts={latestPosts} />

      <RightNow reads={currentReads} />

      <Voices voices={homeVoices} />
    </Container>
  );
}
