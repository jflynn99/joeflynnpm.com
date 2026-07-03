import type { Metadata } from "next";
import { resolveProvider } from "@/lib/agent/providers";
import ChatPanel from "@/components/agent/ChatPanel";

export const metadata: Metadata = { title: "Agent" };

export default function AgentPage() {
  // Charts and overlays work without any LLM — the agent is an enhancement.
  // If the server has no provider configured, the panel gates on a BYO key.
  const serverConfigured = resolveProvider({}) !== null;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Ask the data</h1>
      <p className="mt-1 text-sm text-gray-500">
        A natural-language agent over Our World in Data — it searches, composes charts, and
        explains them with cited OWID articles.
      </p>
      <div className="mt-6">
        <ChatPanel serverConfigured={serverConfigured} />
      </div>
    </div>
  );
}
