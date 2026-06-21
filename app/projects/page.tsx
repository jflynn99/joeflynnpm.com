import { Metadata } from "next";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { ProjectGrid } from "@/components/projects";
import { getAllProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "A collection of projects I've built and contributed to.",
};

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <Container>
      <div className="mb-8">
        <WeightRampTitle
          as="h1"
          className="text-3xl tracking-tight sm:text-4xl"
          text="Projects"
        />
        <p className="mt-2 text-muted">
          A collection of more project based articles where I produced real outputs.
        </p>
      </div>

      <ProjectGrid projects={projects} />
    </Container>
  );
}
