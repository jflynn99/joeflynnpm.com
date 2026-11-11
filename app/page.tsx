import { Container } from "@/components/layout";
import { Hero, RightNow, LatestPosts, FeaturedProject } from "@/components/home";
import { getCurrentReads } from "@/lib/currentReads";
import { getLatestPosts } from "@/lib/posts";
import { getFeaturedProjects } from "@/lib/projects";

export default function HomePage() {
  const latestPosts = getLatestPosts(3);
  const featuredProjects = getFeaturedProjects();
  const featuredProject = featuredProjects[0];
  const currentReads = getCurrentReads();

  return (
    <Container>
      <Hero />

      <RightNow reads={currentReads} />

      {featuredProject && <FeaturedProject project={featuredProject} />}

      <LatestPosts posts={latestPosts} />
    </Container>
  );
}
