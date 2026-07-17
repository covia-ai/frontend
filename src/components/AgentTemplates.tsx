"use client";

import { Code, FileText, Pen, Settings, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { AddNewAgent } from "./AddNewAgent";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { PageHeading } from "./PageHeading";

interface AgentTemplate {
  name: string;
  agentId: string;
  description: string;
  icon: React.ReactNode;
  systemPrompt: string;
  provider: string;
}

const templates: AgentTemplate[] = [
  {
    name: "Code Assistant",
    agentId: "code-assistant",
    description: "Analyze, debug, and review code across multiple languages and frameworks.",
    icon: <Code size={32} />,
    systemPrompt:
      "You are an expert software engineer. Help the user analyze, debug, write, and review code across any language or framework. Be precise and concise, and explain your reasoning when it aids understanding.",
    provider: "anthropic",
  },
  {
    name: "Document Analyst",
    agentId: "document-analyst",
    description: "Extract and summarize key information from documents and data.",
    icon: <FileText size={32} />,
    systemPrompt:
      "You are an expert document analyst. Extract key information, summarize content, identify important data points, and answer questions about documents provided to you. Be thorough and accurate.",
    provider: "openai",
  },
  {
    name: "Creative Writer",
    agentId: "creative-writer",
    description: "Craft blog posts, marketing copy, and social media content.",
    icon: <Pen size={32} />,
    systemPrompt:
      "You are a skilled creative writer. Craft engaging blog posts, marketing copy, social media content, and other written material tailored to the user's goals and audience. Match the requested tone and style.",
    provider: "anthropic",
  },
  {
    name: "Orchestrator Agent",
    agentId: "orchestrator",
    description: "Manage and coordinate multiple agents across different sub-systems.",
    icon: <Settings size={32} />,
    systemPrompt:
      "You are an orchestrator agent responsible for coordinating tasks and sub-agents. Break down complex goals into subtasks, delegate work to appropriate tools or agents, track progress, and synthesize results into a coherent outcome.",
    provider: "anthropic",
  },
];

interface AgentTemplatesProps {
  onCreated?: () => void;
}

export function AgentTemplates({ onCreated }: AgentTemplatesProps = {}) {
  const isAuthenticated = useIsAuthenticated();

  return (
    <div className="flex flex-col items-center justify-center w-full px-10 py-10">
      <PageHeading className="mb-8" text="Choose a Template to start your" highlight="agent" />
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => (
          <Card
            key={template.name}
            className="bg-card border border-muted hover:border-accent flex flex-col items-center justify-between p-6 gap-4 rounded-lg transition-colors"
          >
            <div className="text-primary mt-2">{template.icon}</div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                {template.name}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {template.description}
              </p>
            </div>
            {isAuthenticated ? (
              <AddNewAgent
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-primary text-primary hover:bg-primary/20 hover:text-primary"
                  >
                    Use Template
                  </Button>
                }
                initialAgentName={template.agentId}
                initialSystemPrompt={template.systemPrompt}
                initialProvider={template.provider}
                onCreated={onCreated}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full mt-2 gap-2 text-muted-foreground"
              >
                <Lock size={12} />
                Sign in to use
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
