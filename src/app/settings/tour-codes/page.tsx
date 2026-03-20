// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function TourCodeSystem() {
  const queryClient = useQueryClient();

  const { data: tourTypes = [] } = useQuery({
    queryKey: ['tourTypes'],
    queryFn: async () => {
      const { data } = await supabase.from('tour_types').select('*');
      return data || [];
    }
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    }
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ['tourDestinations'],
    queryFn: async () => {
      const { data } = await supabase.from('tour_destinations').select('*');
      return data || [];
    }
  });

  const { data: difficulties = [] } = useQuery({
    queryKey: ['tourDifficulties'],
    queryFn: async () => {
      const { data } = await supabase.from('tour_difficulties').select('*');
      return data || [];
    }
  });

  const [typeDialog, setTypeDialog] = useState(false);
  const [regionDialog, setRegionDialog] = useState(false);
  const [destDialog, setDestDialog] = useState(false);
  const [diffDialog, setDiffDialog] = useState(false);

  const [typeForm, setTypeForm] = useState({ code: '', label: '' });
  const [regionForm, setRegionForm] = useState({ code: '', label: '', country: 'IE' });
  const [destForm, setDestForm] = useState({ code: '', label: '', region_id: '' });
  const [diffForm, setDiffForm] = useState({ code: '', label: '' });

  const createTypeMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('tour_types').insert(data).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourTypes'] });
      setTypeDialog(false);
      setTypeForm({ code: '', label: '' });
      toast.success('Tour type created');
    }
  });

  const createRegionMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('regions').insert(data).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setRegionDialog(false);
      setRegionForm({ code: '', label: '', country: 'IE' });
      toast.success('Region created');
    }
  });

  const createDestMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('tour_destinations').insert(data).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourDestinations'] });
      setDestDialog(false);
      setDestForm({ code: '', label: '', region_id: '' });
      toast.success('Destination created');
    }
  });

  const createDiffMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('tour_difficulties').insert(data).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourDifficulties'] });
      setDiffDialog(false);
      setDiffForm({ code: '', label: '' });
      toast.success('Difficulty level created');
    }
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('tour_types').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourTypes'] });
      toast.success('Tour type deleted');
    }
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('regions').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success('Region deleted');
    }
  });

  const deleteDestMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('tour_destinations').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourDestinations'] });
      toast.success('Destination deleted');
    }
  });

  const deleteDiffMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('tour_difficulties').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourDifficulties'] });
      toast.success('Difficulty level deleted');
    }
  });

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Tour Code System</h1>
          <p className="text-slate-600 mt-1">
            Manage tour type, region, destination, and difficulty codes
          </p>
        </div>

        <Tabs defaultValue="types" className="space-y-6">
          <TabsList>
            <TabsTrigger value="types">Tour Types</TabsTrigger>
            <TabsTrigger value="regions">Regions</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
            <TabsTrigger value="difficulties">Difficulties</TabsTrigger>
            <TabsTrigger value="legend">Code Legend</TabsTrigger>
          </TabsList>

          <TabsContent value="types">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tour Types</CardTitle>
                <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 text-white bg-whi hover:bg-whi-hover">
                      <Plus className="w-4 h-4" />
                      Add Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Tour Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Code *</Label>
                        <Input
                          value={typeForm.code}
                          onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                          maxLength={1}
                          placeholder="S"
                        />
                      </div>
                      <div>
                        <Label>Label *</Label>
                        <Input
                          value={typeForm.label}
                          onChange={(e) => setTypeForm({ ...typeForm, label: e.target.value })}
                          placeholder="Self-Guided"
                        />
                      </div>
                      <Button
                        onClick={() => createTypeMutation.mutate(typeForm)}
                        disabled={!typeForm.code || !typeForm.label}
                        className="w-full"
                      >
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tourTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-mono font-bold">{type.code}</TableCell>
                        <TableCell>{type.label}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Delete this type?')) {
                                deleteTypeMutation.mutate(type.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Regions</CardTitle>
                <Dialog open={regionDialog} onOpenChange={setRegionDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 text-white bg-whi hover:bg-whi-hover">
                      <Plus className="w-4 h-4" />
                      Add Region
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Region</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Code *</Label>
                        <Input
                          value={regionForm.code}
                          onChange={(e) => setRegionForm({ ...regionForm, code: e.target.value.toUpperCase() })}
                          maxLength={2}
                          placeholder="WA"
                        />
                      </div>
                      <div>
                        <Label>Label *</Label>
                        <Input
                          value={regionForm.label}
                          onChange={(e) => setRegionForm({ ...regionForm, label: e.target.value })}
                          placeholder="Wild Atlantic Way"
                        />
                      </div>
                      <div>
                        <Label>Country *</Label>
                        <Select value={regionForm.country} onValueChange={(value) => setRegionForm({ ...regionForm, country: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IE">IE</SelectItem>
                            <SelectItem value="NI">NI</SelectItem>
                            <SelectItem value="IE/NI">IE/NI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => createRegionMutation.mutate(regionForm)}
                        disabled={!regionForm.code || !regionForm.label}
                        className="w-full"
                      >
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions.map((region) => (
                      <TableRow key={region.id}>
                        <TableCell className="font-mono font-bold">{region.code}</TableCell>
                        <TableCell>{region.label}</TableCell>
                        <TableCell>{region.country}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Delete this region?')) {
                                deleteRegionMutation.mutate(region.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="destinations">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Destinations</CardTitle>
                <Dialog open={destDialog} onOpenChange={setDestDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 text-white bg-whi hover:bg-whi-hover">
                      <Plus className="w-4 h-4" />
                      Add Destination
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Destination</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Code *</Label>
                        <Input
                          value={destForm.code}
                          onChange={(e) => setDestForm({ ...destForm, code: e.target.value.toUpperCase() })}
                          maxLength={2}
                          placeholder="KW"
                        />
                      </div>
                      <div>
                        <Label>Label *</Label>
                        <Input
                          value={destForm.label}
                          onChange={(e) => setDestForm({ ...destForm, label: e.target.value })}
                          placeholder="Kerry Way"
                        />
                      </div>
                      <div>
                        <Label>Region *</Label>
                        <Select value={destForm.region_id} onValueChange={(value) => setDestForm({ ...destForm, region_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((region) => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.label} ({region.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => createDestMutation.mutate(destForm)}
                        disabled={!destForm.code || !destForm.label || !destForm.region_id}
                        className="w-full"
                      >
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinations.map((dest) => {
                      const region = regions.find(r => r.id === dest.region_id);
                      return (
                        <TableRow key={dest.id}>
                          <TableCell className="font-mono font-bold">{dest.code}</TableCell>
                          <TableCell>{dest.label}</TableCell>
                          <TableCell>{region?.label} ({region?.code})</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Delete this destination?')) {
                                  deleteDestMutation.mutate(dest.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="difficulties">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Difficulty Levels</CardTitle>
                <Dialog open={diffDialog} onOpenChange={setDiffDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 text-white bg-whi hover:bg-whi-hover">
                      <Plus className="w-4 h-4" />
                      Add Difficulty
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Difficulty Level</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Code *</Label>
                        <Input
                          value={diffForm.code}
                          onChange={(e) => setDiffForm({ ...diffForm, code: e.target.value.toUpperCase() })}
                          maxLength={1}
                          placeholder="E"
                        />
                      </div>
                      <div>
                        <Label>Label *</Label>
                        <Input
                          value={diffForm.label}
                          onChange={(e) => setDiffForm({ ...diffForm, label: e.target.value })}
                          placeholder="Easy"
                        />
                      </div>
                      <Button
                        onClick={() => createDiffMutation.mutate(diffForm)}
                        disabled={!diffForm.code || !diffForm.label}
                        className="w-full"
                      >
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {difficulties.map((diff) => (
                      <TableRow key={diff.id}>
                        <TableCell className="font-mono font-bold">{diff.code}</TableCell>
                        <TableCell>{diff.label}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Delete this difficulty level?')) {
                                deleteDiffMutation.mutate(diff.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legend">
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Tour Code Format Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-whi-subtle rounded-lg border border-whi">
                  <p className="font-mono text-lg font-bold text-center text-slate-900">
                    [Type][Region]-[Destination]-[Duration][Difficulty]
                  </p>
                  <p className="text-sm text-center text-slate-600 mt-2">
                    Example: <span className="font-mono font-bold">SWA-KW-7D</span> = Self-Guided + Wild Atlantic Way + Kerry Way + 7 days + Difficult
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Tour Types</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Label</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tourTypes.map((type) => (
                          <TableRow key={type.id}>
                            <TableCell className="font-mono font-bold">{type.code}</TableCell>
                            <TableCell>{type.label}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Difficulty Levels</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Label</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {difficulties.map((diff) => (
                          <TableRow key={diff.id}>
                            <TableCell className="font-mono font-bold">{diff.code}</TableCell>
                            <TableCell>{diff.label}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Regions</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Country</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regions.map((region) => (
                        <TableRow key={region.id}>
                          <TableCell className="font-mono font-bold">{region.code}</TableCell>
                          <TableCell>{region.label}</TableCell>
                          <TableCell>{region.country}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Destinations (by Region)</h3>
                  {regions.map((region) => {
                    const regionDests = destinations.filter(d => d.region_id === region.id);
                    if (regionDests.length === 0) return null;
                    return (
                      <div key={region.id} className="mb-4">
                        <h4 className="text-sm font-medium text-slate-600 mb-2">
                          {region.label} ({region.code})
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Destination</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regionDests.map((dest) => (
                              <TableRow key={dest.id}>
                                <TableCell className="font-mono font-bold">{dest.code}</TableCell>
                                <TableCell>{dest.label}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}