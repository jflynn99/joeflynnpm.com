import { Metadata } from "next";
import { Container } from "@/components/layout";
import { WeightRampTitle } from "@/components/WeightRampTitle";
import { AgentForm } from "@/components/agent";

export const metadata: Metadata = {
  title: "Product Decision Agent",
  description:
    "An AI-powered research agent that investigates product questions and produces structured decision briefs with evidence, trade-offs, and recommendations.",
};

export default function AgentPage() {
  return (
    <Container>
      <div className="mb-8">
        <WeightRampTitle
          as="h1"
          className="text-3xl tracking-tight sm:text-4xl"
          text="Product Decision Agent"
        />
        <p className="mt-2 text-muted">
          Ask a product question and an AI agent will research it across the web,
          then produce a structured decision brief with evidence, trade-offs, and
          a recommendation.
        </p>
      </div>

      <AgentForm />
    </Container>
  );
}
