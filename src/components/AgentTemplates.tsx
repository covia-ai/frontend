"use client";

import { Code, FileText, Pen, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface AgentTemplate {
  name: string;
  description: string;
  icon: React.ReactNode;
}

const templates: AgentTemplate[] = [
  {
    name: "Code Assistant",
    description: "Analyze, debug, and review code across multiple languages and frameworks.",
    icon: <Code size={32} />,
  },
  {
    name: "Document Analyst",
    description: "Extract and summarize key information from documents and data.",
    icon: <FileText size={32} />,
  },
  {
    name: "Creative Writer",
    description: "Craft blog posts, marketing copy, and social media content.",
    icon: <Pen size={32} />,
  },
  {
    name: "Orchestrator Agent",
    description: "Manage and coordinate multiple agents across different sub-systems.",
    icon: <Settings size={32} />,
  },
];

export function AgentTemplates() {
  return (
    <div className="flex flex-col items-center justify-center w-full px-10 py-10">
      <h3 className="text-center text-2xl font-thin mb-8">
        Choose a Template to start your{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          agent
        </span>
      </h3>
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
            <Button variant="outline" size="sm" className="w-full mt-2 border-primary text-primary hover:bg-primary/20 hover:text-primary">
              Use Template
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
