// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Image } from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { Code, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Minus, ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import ImageLibraryPicker from '@/components/ImageLibraryPicker';

const ToolbarButton = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={cn(
      'px-1.5 py-1 rounded text-xs transition-colors',
      active ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-200'
    )}
  >
    {children}
  </button>
);

export default function MarkdownEditor({ value, onChange, rows = 6, placeholder = '', className = '' }) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlInput, setHtmlInput] = useState(value || '');
  const [showImagePicker, setShowImagePicker] = useState(false);

  const minHeight = `${rows * 1.75}rem`;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync external value changes (e.g. after auto-translate) into the editor
  useEffect(() => {
    if (!editor) return;
    if (isHtmlMode) {
      setHtmlInput(value || '');
    } else {
      const current = editor.getHTML();
      if (current !== value) {
        editor.commands.setContent(value || '', false);
      }
    }
  }, [value]);

  const handleToggleMode = useCallback(() => {
    if (!isHtmlMode) {
      // Switching to HTML: snapshot current editor HTML
      setHtmlInput(editor ? editor.getHTML() : (value || ''));
    } else {
      // Switching back to WYSIWYG: push HTML into editor
      if (editor) {
        editor.commands.setContent(htmlInput, false);
      }
      onChange(htmlInput);
    }
    setIsHtmlMode((m) => !m);
  }, [isHtmlMode, editor, htmlInput, value, onChange]);

  return (
    <div className={cn('rounded-md border border-input bg-background overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-slate-50 flex-wrap gap-1">
        {!isHtmlMode && editor && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolbarButton>
            <span className="w-px h-4 bg-slate-300 mx-0.5" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Minus className="w-3 h-3" /></ToolbarButton>
            <span className="w-px h-4 bg-slate-300 mx-0.5" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><List className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List"><ListOrdered className="w-3 h-3" /></ToolbarButton>
            <span className="w-px h-4 bg-slate-300 mx-0.5" />
            <ToolbarButton onClick={() => setShowImagePicker(true)} active={false} title="Insert Image from Library"><ImageIcon className="w-3 h-3" /></ToolbarButton>
          </div>
        )}
        {isHtmlMode && <div />}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleToggleMode(); }}
          title={isHtmlMode ? 'Switch to Visual Editor' : 'Edit raw HTML'}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ml-auto',
            isHtmlMode ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
          )}
        >
          <Code className="w-3 h-3" />
          {isHtmlMode ? 'Visual' : 'HTML'}
        </button>
      </div>

      {isHtmlMode ? (
        <Textarea
          value={htmlInput}
          onChange={(e) => {
            setHtmlInput(e.target.value);
            onChange(e.target.value);
          }}
          rows={rows}
          placeholder={placeholder}
          className="font-mono text-xs border-0 rounded-none bg-slate-900 text-green-300 resize-y"
          style={{ minHeight }}
        />
      ) : (
        <div style={{ minHeight }}>
          <style>{`
            .tiptap-editor .ProseMirror { outline: none; padding: 0.75rem; min-height: inherit; }
            .tiptap-editor .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; }
            .tiptap-editor .ProseMirror h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.4rem; }
            .tiptap-editor .ProseMirror p { margin: 0.4rem 0; line-height: 1.6; }
            .tiptap-editor .ProseMirror strong { font-weight: 700; }
            .tiptap-editor .ProseMirror em { font-style: italic; }
            .tiptap-editor .ProseMirror u { text-decoration: underline; }
            .tiptap-editor .ProseMirror s { text-decoration: line-through; }
            .tiptap-editor .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
            .tiptap-editor .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
            .tiptap-editor .ProseMirror li { margin: 0.25rem 0; }
            .tiptap-editor .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
            .tiptap-editor .ProseMirror table td, .tiptap-editor .ProseMirror table th { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
            .tiptap-editor .ProseMirror table th { background: #f1f5f9; font-weight: 600; }
            .tiptap-editor .ProseMirror blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #64748b; margin: 0.5rem 0; }
            .tiptap-editor .ProseMirror img { max-width: 100%; height: auto; border-radius: 0.375rem; margin: 0.5rem 0; cursor: default; }
            .tiptap-editor .ProseMirror img.ProseMirror-selectednode { outline: 2px solid #6366f1; }
          `}</style>
          <div className="tiptap-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
      <ImageLibraryPicker
        open={showImagePicker}
        onOpenChange={setShowImagePicker}
        onSelect={(img) => {
          editor?.chain().focus().setImage({ src: img.url, alt: img.alt_text || img.title }).run();
          setShowImagePicker(false);
        }}
      />
    </div>
  );
}