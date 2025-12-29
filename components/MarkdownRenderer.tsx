import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
            // Custom renderer for code blocks if needed, but default is usually fine
            // We can add syntax highlighting here with react-syntax-highlighter if requested
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default React.memo(MarkdownRenderer);