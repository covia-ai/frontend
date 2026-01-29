'use client';

import { useState } from 'react';

export const AgentTree = ({ node,thisLeveOpen }) => {
  const [isOpen, setIsOpen] = useState(thisLeveOpen);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        className={`flex items-start gap-2 py-1 text-black ${
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
            <AgentTree key={index} node={child} thisLeveOpen={false}/>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TreeStructure() {
  const treeData = {
    label: '👤 Customer Support',
    children: [
      {
        label: '🎫 Platform Migration Support',
        children: [
          {
            label: '🤖 Database Migration Agent',
           
          },
          {
            label: '🤖 API Integration Agent',
           
          },
          {
            label: '🤖 User Communication Agent',
          
          },
        ],
      },
      {
        label: '🎫  Billing Discrepancy Investigation',
        children: [
          {
            label: '🤖 Transaction Analysis Agent',
           
          },
          {
            label: '🤖 Finance Coordination Agent',
           
          },
          {
            label: '🤖 Customer Relations Agent',
            
          },
        ],
      },
      {
        label: '🎫  Feature Request - Custom Reporting',
        children: [
          {
            label: '🤖 Requirements Gathering Agent',
           
          },
          {
            label: '🤖 Feasibility Analysis Agent',
           
          },
          {
            label: '🤖 Product Liaison Agent',
            
          },
        ],
      },
      {
        label: '🎫  Security Audit Compliance',
        children: [
          {
            label: '🤖 Compliance Documentation Agent',
           
          },
          {
            label: '🤖 Security Review Agent',
           
          },
          {
            label: '🤖 Client Reporting Agent',
           
          },
        ],
      },
    ],
  };

  return (
          <div className="flex items-center gap-2 mb-6 p-4 bg-white rounded-lg border border-gray-200">

                  <AgentTree node={treeData} thisLeveOpen={true}/>
         </div>
      
  );
}
