// @ts-nocheck
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import WHIRichEditor from '../WHIRichEditor';
import GlobalServicesDisplay from '../GlobalServicesDisplay';
import AdditionalInclusionsList from '../AdditionalInclusionsList';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { GripVertical, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getFieldKey, getRichTextField, getParsedArrayField } from '../LanguageAwareInput';

export default function TourContent({
  formData,
  selectedLanguage,
  saveMutation,
  handleInputChange,
  isTranslating,
  onSave
}) {
  return (
    <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-slate-900">Tour Content</CardTitle>
          <CardDescription>Descriptions and global services</CardDescription>
        </div>
        <Button onClick={onSave} disabled={saveMutation.isPending} className="bg-slate-300 text-slate-800 px-3 text-xs font-medium rounded-[10px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-whi-hover" size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="overview">Overview</Label>
          <WHIRichEditor
            value={getRichTextField(formData, 'description', selectedLanguage)}
            onChange={(html) => handleInputChange(getFieldKey('description', selectedLanguage), html)}
            minHeight="400px"
            disabled={isTranslating} />

        </div>

        <EditableList
          label="Highlights"
          items={getParsedArrayField(formData, 'highlights', selectedLanguage)}
          onChange={(items) => handleInputChange(getFieldKey('highlights', selectedLanguage), items)}
          disabled={isTranslating} />


        <div className="space-y-2">
          <Label htmlFor="who_is_it_for">Who Is It For</Label>
          <WHIRichEditor
            value={getRichTextField(formData, 'who_is_it_for', selectedLanguage)}
            onChange={(html) => handleInputChange(getFieldKey('who_is_it_for', selectedLanguage), html)}
            minHeight="200px"
            disabled={isTranslating} />

        </div>

        <div className="border-t pt-6">
          <GlobalServicesDisplay />
        </div>

        <div className="border-t pt-6">
          <AdditionalInclusionsList
            items={getParsedArrayField(formData, 'additional_inclusions', selectedLanguage)}
            onChange={(items) => handleInputChange(getFieldKey('additional_inclusions', selectedLanguage), items)} />

        </div>
      </CardContent>
    </Card>);

}

function EditableList({ label, items, onChange, disabled }) {
  const [newItem, setNewItem] = React.useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={label}>
          {(provided) =>
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {items.map((item, index) =>
                <Draggable key={index} draggableId={`${label}-${index}`} index={index}>
                  {(provided) =>
                    <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center gap-2">
                      <div {...provided.dragHandleProps}>
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>
                      <Input value={item} onChange={(e) => updateItem(index, e.target.value)} className="flex-1" disabled={disabled} />
                      <Button size="icon" onClick={() => removeItem(index)} className="bg-red-600 text-white hover:bg-red-700">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  }
                </Draggable>
              )}
              {provided.placeholder}
            </div>
          }
        </Droppable>
      </DragDropContext>

      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          placeholder={`Add ${label.toLowerCase()} item...`}
          disabled={disabled} />

        <Button onClick={addItem} className="bg-slate-300 text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-whi-hover" disabled={disabled}>
          Add
        </Button>
      </div>
    </div>);

}