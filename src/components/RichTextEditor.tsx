// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Bold, Italic, Underline as UnderlineIcon, Code, Heading2, List, ListOrdered,
  Link as LinkIcon, Undo2, Redo2, Quote, Eye
} from 'lucide-react';
import { sanitizeHtml } from './sanitize';

const RichTextEditor = ({ value, onChange, placeholder = 'Enter content...', minHeight = '300px' }) => {
   const [viewMode, setViewMode] = useState('editor');
   const [markdownContent, setMarkdownContent] = useState('');
   const editor = useEditor({
     extensions: [
       StarterKit,
       Underline,
       Link.configure({ openOnClick: false }),
       Table.configure({ resizable: true }),
       TableRow,
       TableHeader,
       TableCell,
       TextStyle,
       Color,
       Highlight.configure({ multicolor: true }),
     ],
     content: value,
     onUpdate: ({ editor }) => onChange(editor.getHTML()),
     editorProps: {
       attributes: {
         class: 'focus:outline-none px-4 py-3 bg-white text-slate-900',
       },
     },
   });

   // Update editor content when value prop changes
   React.useEffect(() => {
     if (editor && value !== editor.getHTML()) {
       editor.commands.setContent(value);
     }
   }, [value, editor]);

  if (!editor) return null;

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const toggleHighlight = () => {
    editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run();
  };

  const htmlContent = editor.getHTML();

  return (
    <div className="space-y-2">
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-2">
          <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-md border border-slate-200">
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('bold') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="h-8 w-8 p-0"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant={editor.isActive('italic') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="h-8 w-8 p-0"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant={editor.isActive('underline') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className="h-8 w-8 p-0"
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </Button>

            <div className="w-px bg-slate-300 mx-1" />

            <Button
              type="button"
              size="sm"
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="h-8 w-8 p-0"
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant={editor.isActive('bulletList') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className="h-8 w-8 p-0"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant={editor.isActive('orderedList') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className="h-8 w-8 p-0"
              title="Ordered List"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant={editor.isActive('blockquote') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className="h-8 w-8 p-0"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant={editor.isActive('codeBlock') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className="h-8 w-8 p-0"
              title="Code Block"
            >
              <Code className="w-4 h-4" />
            </Button>

            <div className="w-px bg-slate-300 mx-1" />

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addLink}
              className="h-8 w-8 p-0"
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>

            <div className="w-px bg-slate-300 mx-1" />

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          <EditorContent
            editor={editor}
            style={{ minHeight, maxHeight: '600px', overflow: 'auto' }}
            className="border border-slate-200 rounded-md bg-white"
          />
        </TabsContent>

        {/* Markdown Tab */}
        <TabsContent value="markdown">
          <Textarea
            value={markdownContent || new TurndownService().turndown(htmlContent)}
            onChange={(e) => setMarkdownContent(e.target.value)}
            onBlur={(e) => {
              const html = marked(e.target.value);
              editor.commands.setContent(html);
              onChange(html);
            }}
            style={{ minHeight, maxHeight: '600px' }}
            className="font-mono text-sm border-slate-200"
            placeholder="Paste or write Markdown..."
          />
        </TabsContent>

        {/* HTML Tab */}
        <TabsContent value="html">
          <Textarea
            value={htmlContent}
            onChange={(e) => {
              const newHtml = e.target.value;
              onChange(newHtml);
            }}
            style={{ minHeight: '600px' }}
            className="font-mono text-sm border-slate-200 resize-vertical"
            placeholder="Raw HTML..."
          />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <div
            style={{ minHeight, maxHeight: '600px', overflow: 'auto' }}
            className="border border-slate-200 rounded-md bg-white p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RichTextEditor;