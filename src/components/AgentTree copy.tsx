'use client';

import { useState } from 'react';

export const AgentTree = ({ node }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        className={`flex items-start gap-2 py-1 ${
          hasChildren ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {hasChildren && (
          <span className="w-4 flex items-start justify-center">
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
          </span>
        )}
        {!hasChildren && <span className="w-4"></span>}
        <span>{node.label}</span>
      </div>
      {isOpen && hasChildren && (
        <div className="ml-4 border-l-2 border-gray-200 pl-2">
          {node.children.map((child, index) => (
            <AgentTree key={index} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function TreeStructure() {
  const treeData = {
    label: '👤 Customer Support Agent',
    children: [
      {
        label: '🎫 Platform Migration Support',
        children: [
          {
            label: '🤖 Database Migration Agent',
            children: [
              { label: '✓ Backup current database - Completed' },
              { label: '⏳ Migrate user data - In Progress' },
              { label: '⏸️ Validate data integrity - Pending' },
            ],
          },
          {
            label: '🤖 API Integration Agent',
            children: [
              { label: '✓ Update API endpoints - Completed' },
              { label: '⏳ Test authentication flow - In Progress' },
              { label: '⏸️ Deploy to staging - Pending' },
            ],
          },
          {
            label: '🤖 User Communication Agent',
            children: [
              { label: '✓ Draft migration announcement - Completed' },
              { label: '⏸️ Schedule email campaign - Pending' },
              { label: '⏸️ Prepare FAQ documentation - Pending' },
            ],
          },
        ],
      },
      {
        label: '🎫  Billing Discrepancy Investigation',
        children: [
          {
            label: '🤖 Transaction Analysis Agent',
            children: [
              { label: '✓ Pull transaction logs (Jan-Mar) - Completed' },
              { label: '✓ Identify duplicate charges - Completed' },
              { label: '⏳ Calculate refund amount - In Progress' },
            ],
          },
          {
            label: '🤖 Finance Coordination Agent',
            children: [
              { label: '⏳ Submit refund request - In Progress' },
              { label: '⏸️ Update billing records - Pending' },
              { label: '⏸️ Generate corrected invoice - Pending' },
            ],
          },
          {
            label: '🤖 Customer Relations Agent',
            children: [
              { label: '✓ Send acknowledgment email - Completed' },
              { label: '⏸️ Schedule follow-up call - Pending' },
            ],
          },
        ],
      },
      {
        label: '🎫  Feature Request - Custom Reporting',
        children: [
          {
            label: '🤖 Requirements Gathering Agent',
            children: [
              { label: '✓ Conduct stakeholder interview - Completed' },
              { label: '✓ Document use cases - Completed' },
              { label: '⏳ Create technical specification - In Progress' },
            ],
          },
          {
            label: '🤖 Feasibility Analysis Agent',
            children: [
              { label: '⏳ Assess development effort - In Progress' },
              { label: '⏸️ Review with engineering team - Pending' },
              { label: '⏸️ Prepare cost estimate - Pending' },
            ],
          },
          {
            label: '🤖 Product Liaison Agent',
            children: [
              { label: '⏸️ Add to product roadmap - Pending' },
              { label: '⏸️ Provide timeline to client - Pending' },
            ],
          },
        ],
      },
      {
        label: '🎫  Security Audit Compliance',
        children: [
          {
            label: '🤖 Compliance Documentation Agent',
            children: [
              { label: '✓ Gather security certificates - Completed' },
              { label: '✓ Compile audit logs - Completed' },
              { label: '✓ Prepare SOC 2 documentation - Completed' },
            ],
          },
          {
            label: '🤖 Security Review Agent',
            children: [
              { label: '✓ Conduct vulnerability scan - Completed' },
              { label: '⏳ Generate compliance report - In Progress' },
              { label: '⏸️ Schedule audit meeting - Pending' },
            ],
          },
          {
            label: '🤖 Client Reporting Agent',
            children: [
              { label: '⏸️ Create executive summary - Pending' },
              { label: '⏸️ Present findings to client - Pending' },
            ],
          },
        ],
      },
    ],
  };

  return (
        <AgentTree node={treeData} />
      
  );
}
