// @ts-nocheck
"use client";

import React from 'react';
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
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Link as LinkIcon, Table as TableIcon,
  Undo2, Redo2, Palette, Highlighter, Minus,
  Plus, Trash2, X, Heading2, Heading3, Heading4 } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const WHI_COLORS = ['#F17E00', '#3F0F87', '#210747', '#B58DB6', '#000000'];

export default function WHIRichEditor({ value = '', onChange, minHeight = '200px' }) {
  const [linkUrl, setLinkUrl] = React.useState('');
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [customColor, setCustomColor] = React.useState('#000000');

  const editor = useEditor({
    extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] }
    }),
    Underline,
    Link.configure({ openOnClick: false }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true })],

    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    }
  });

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const ToolbarButton = ({ isActive, onClick, icon: Icon, title }) =>
  <button
    onClick={onClick}
    title={title}
    className={`p-2 rounded transition-colors ${
    isActive ?
    'bg-whi text-white' :
    'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
    }>

      <Icon className="w-4 h-4" />
    </button>;


  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Sticky Toolbar */}
      <div className="bg-white text-slate-900 p-2 sticky top-0 z-10 border-b border-slate-200 flex flex-wrap gap-1">
        {/* Headings */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <ToolbarButton
            isActive={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            icon={Heading2}
            title="Heading 2" />

          <ToolbarButton
            isActive={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            icon={Heading3}
            title="Heading 3" />

          <ToolbarButton
            isActive={editor.isActive('heading', { level: 4 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            icon={Heading4}
            title="Heading 4" />

        </div>

        {/* Formatting */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <ToolbarButton
            isActive={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={Bold}
            title="Bold" />

          <ToolbarButton
            isActive={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={Italic}
            title="Italic" />

          <ToolbarButton
            isActive={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            icon={UnderlineIcon}
            title="Underline" />

          <ToolbarButton
            isActive={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            icon={Strikethrough}
            title="Strikethrough" />

        </div>

        {/* Lists & Quote */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <ToolbarButton
            isActive={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon={List}
            title="Bullet List" />

          <ToolbarButton
            isActive={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            icon={ListOrdered}
            title="Ordered List" />

          <ToolbarButton
            isActive={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            icon={Quote}
            title="Blockquote" />

        </div>

        {/* Table */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <ToolbarButton
            onClick={insertTable}
            icon={TableIcon}
            title="Insert Table" />

          {editor.isActive('table') &&
          <>
              <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              icon={Plus}
              title="Add Row" />

              <ToolbarButton
              onClick={() => editor.chain().focus().deleteRow().run()}
              icon={Trash2}
              title="Delete Row" />

            </>
          }
        </div>

        {/* Link */}
        <div className="flex gap-1 border-r border-slate-300 pr-2 relative">
          <ToolbarButton
            isActive={editor.isActive('link')}
            onClick={() => setShowLinkInput(!showLinkInput)}
            icon={LinkIcon}
            title="Add Link" />

          {showLinkInput &&
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg p-2 z-20 shadow-lg">
              <div className="flex gap-2">
                <Input
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLink()}
                className="text-sm"
                autoFocus />

                <Button size="sm" onClick={addLink} className="text-white bg-whi hover:bg-whi-hover">
                  Set
                </Button>
              </div>
            </div>
          }
        </div>

        {/* Color & Highlight */}
        <div className="flex gap-1 border-r border-slate-300 pr-2 relative">
          <ToolbarButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            icon={Palette}
            title="Text Color" />

          {showColorPicker &&
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg p-3 z-20 shadow-lg">
              <div className="flex gap-2 mb-2">
                {WHI_COLORS.map((color) =>
              <button
                key={color}
                onClick={() => {
                  editor.chain().focus().setColor(color).run();
                  setShowColorPicker(false);
                }}
                className="w-6 h-6 rounded border border-slate-300"
                style={{ backgroundColor: color }}
                title={color} />

              )}
              </div>
              <div className="flex gap-2">
                <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer" />

                <Button
                size="sm"
                onClick={() => {
                  editor.chain().focus().setColor(customColor).run();
                  setShowColorPicker(false);
                }}
                className="text-white bg-whi hover:bg-whi-hover">

                  Apply
                </Button>
              </div>
            </div>
          }
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#FFF59D' }).run()}
            icon={Highlighter}
            title="Highlight" />

        </div>

        {/* HR */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            icon={Minus}
            title="Horizontal Rule" />

        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo2}
            title="Undo" />

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo2}
            title="Redo" />

        </div>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose max-w-none p-4"
        style={{ minHeight }} />


      {/* Prose Styles */}
      <style>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
        }
        .ProseMirror h4 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          margin-left: 1.5rem;
        }
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1rem 0;
          width: 100%;
        }
        .ProseMirror table td, .ProseMirror table th {
          border: 1px solid #e2e8f0;
          padding: 0.75rem;
        }
        .ProseMirror table th {
          background-color: #f1f5f9;
          font-weight: 600;
        }
      `}</style>
    </div>);

}