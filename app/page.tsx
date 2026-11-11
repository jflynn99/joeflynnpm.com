import { Container } from "@/components/layout";
import { Hero, RightNow, LatestPosts, FeaturedProject } from "@/components/home";
import { getCurrentReads } from "@/lib/currentReads";
import { getYearSoFar } from "@/lib/yearSoFar";
import { getLatestPosts } from "@/lib/posts";
import { getFeaturedProjects } from "@/lib/projects";

export default function HomePage() {
  const latestPosts = getLatestPosts(3);
  const featuredProjects = getFeaturedProjects();
  const featuredProject = featuredProjects[0];
  const currentReads = getCurrentReads();
  // The build date sets the year: the page is static, so it is rebuilt on every deploy.
  const yearSoFar = getYearSoFar(new Date().getFullYear());

  return (
    <Container>
      <Hero />

      <RightNow reads={currentReads} yearSoFar={yearSoFar} />

      {featuredProject && <FeaturedProject project={featuredProject} />}

      <LatestPosts posts={latestPosts} />
    </Container>
  );
}
