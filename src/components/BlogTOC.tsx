// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, List } from 'lucide-react';

const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .trim();
};

export const extractHeadings = (htmlContent) => {
  if (!htmlContent) return [];
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const h2Elements = tempDiv.querySelectorAll('h2');
  return Array.from(h2Elements).map(h2 => ({
    text: h2.textContent,
    slug: generateSlug(h2.textContent)
  }));
};

export const injectHeadingIds = (htmlContent) => {
  if (!htmlContent) return htmlContent;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const h2Elements = tempDiv.querySelectorAll('h2');
  h2Elements.forEach(h2 => {
    const slug = generateSlug(h2.textContent);
    h2.id = slug;
  });
  
  return tempDiv.innerHTML;
};

export default function BlogTOC({ headings, language = 'en', collapsible = true }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    const handleScroll = () => {
      headings.forEach(heading => {
        const element = document.getElementById(heading.slug);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 200) {
            // Highlight current section
            const link = document.querySelector(`a[href="#${heading.slug}"]`);
            if (link) {
              document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('toc-active'));
              link.classList.add('toc-active');
            }
          }
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);
  
  const handleClick = (e, slug) => {
    e.preventDefault();
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${slug}`);
    }
  };
  
  const title = language === 'de' ? 'Inhaltsverzeichnis' : 'Table of Contents';
  
  return (
    <div 
      className="mb-8 rounded-lg border-2 p-6"
      style={{ 
        backgroundColor: '#F5F0EB',
        borderColor: '#E5DDD5'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5" style={{ color: '#1B4D3E' }} />
          <h3 className="text-lg font-bold" style={{ color: '#1B4D3E' }}>
            {title}
          </h3>
        </div>
        {collapsible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" style={{ color: '#1B4D3E' }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: '#1B4D3E' }} />
            )}
          </button>
        )}
      </div>
      
      {isExpanded && (
        <ol className="space-y-2 list-decimal list-inside">
          {headings.map((heading, index) => (
            <li key={index} className="text-slate-700">
              <a
                href={`#${heading.slug}`}
                onClick={(e) => handleClick(e, heading.slug)}
                className="toc-link hover:underline transition-colors"
                style={{ color: '#1B4D3E' }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      )}
      
      <style jsx>{`
        .toc-active {
          font-weight: 600;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}