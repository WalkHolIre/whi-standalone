// @ts-nocheck
"use client";

import React from 'react';
import { Helmet } from 'react-helmet';

const stripHtml = (html) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const countWords = (html) => {
  const text = stripHtml(html);
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

export default function BlogPostSchema({ post, siteUrl = 'https://walkingholidayireland.com' }) {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.meta_description || post.excerpt || stripHtml(post.content).substring(0, 160),
    "image": post.featured_image,
    "author": {
      "@type": "Person",
      "name": post.author || "Walking Holiday Ireland"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Walking Holiday Ireland",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "datePublished": post.published_date ? new Date(post.published_date).toISOString() : new Date(post.created_date).toISOString(),
    "dateModified": new Date(post.updated_date || post.created_date).toISOString(),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${post.slug}`
    },
    "wordCount": countWords(post.content),
    "articleSection": post.category,
    "keywords": [post.seo_keywords, ...(post.tags || [])].filter(Boolean).join(', ')
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${siteUrl}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `${siteUrl}/blog/${post.slug}`
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(articleSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <title>{post.meta_title || post.title}</title>
      <meta name="description" content={post.meta_description || post.excerpt || stripHtml(post.content).substring(0, 160)} />
      {post.seo_keywords && <meta name="keywords" content={post.seo_keywords} />}
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.excerpt || stripHtml(post.content).substring(0, 160)} />
      {post.featured_image && <meta property="og:image" content={post.featured_image} />}
      <meta property="og:type" content="article" />
      {post.published_date && <meta property="article:published_time" content={new Date(post.published_date).toISOString()} />}
      {post.author && <meta property="article:author" content={post.author} />}
    </Helmet>
  );
}