// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star, Plus, ThumbsUp, ThumbsDown, Edit, Trash2, MessageSquare, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminReviews() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [tourFilter, setTourFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');

  const [newReview, setNewReview] = useState({
    reviewer_name: '',
    reviewer_country: '',
    title: '',
    content: '',
    rating: 5,
    tour_id: '',
    destination_id: '',
    status: 'approved',
    review_date: new Date().toISOString().split('T')[0],
    source: 'manual'
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data } = await supabase.from('reviews').select('*');
      return data || [];
    }
  });

  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await supabase.from('tours').select('*');
      return data || [];
    }
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*');
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => (await supabase.from('reviews').insert(data).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review added');
      setAddModalOpen(false);
      setNewReview({
        reviewer_name: '',
        reviewer_country: '',
        title: '',
        content: '',
        rating: 5,
        tour_id: '',
        destination_id: '',
        status: 'approved',
        review_date: new Date().toISOString().split('T')[0],
        source: 'manual'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => (await supabase.from('reviews').update(data).eq('id', id).select().single()).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review updated');
      setEditingReview(null);
      setRespondingTo(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await supabase.from('reviews').delete().eq('id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review deleted');
    }
  });

  const handleApprove = (review) => {
    updateMutation.mutate({ id: review.id, data: { status: 'approved' } });
  };

  const handleReject = (review) => {
    updateMutation.mutate({ id: review.id, data: { status: 'rejected' } });
  };

  const handleDelete = (review) => {
    if (confirm(`Delete review by ${review.reviewer_name}?`)) {
      deleteMutation.mutate(review.id);
    }
  };

  const handleRespond = () => {
    updateMutation.mutate({
      id: respondingTo.id,
      data: { admin_response: responseText }
    });
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: editingReview.id,
      data: editingReview
    });
  };

  const handleAddReview = () => {
    createMutation.mutate(newReview);
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
      const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);
      const matchesTour = tourFilter === 'all' || review.tour_id === tourFilter;
      const matchesSearch =
        review.reviewer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.content?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesRating && matchesTour && matchesSearch;
    });
  }, [reviews, statusFilter, ratingFilter, tourFilter, searchTerm]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : 0;

  const statusCounts = {
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length
  };

  const ratingCounts = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { className: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Rejected' }
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getTourName = (tourId) => {
    if (!tourId) return '-';
    const tour = tours.find(t => t.id === tourId);
    return tour ? tour.name : <span className="text-slate-400 italic">Unknown Tour</span>;
  };

  const getDestinationName = (destId) => {
    if (!destId) return '-';
    const dest = destinations.find(d => d.id === destId);
    return dest ? `${dest.name}${dest.country ? `, ${dest.country}` : ''}` : <span className="text-slate-400 italic">Unknown Destination</span>;
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Block */}
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-50/30 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-60"></div>

          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Reviews
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Manage and respond to customer reviews</p>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="gap-2 relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-semibold shadow-sm border-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Review
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 relative overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-indigo-900/60 uppercase tracking-widest leading-tight">Total Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-indigo-900">{reviews.length}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-amber-900/60 uppercase tracking-widest leading-tight">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-black text-amber-900">{avgRating}</p>
                {renderStars(Math.round(avgRating))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 relative overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-emerald-900/60 uppercase tracking-widest leading-tight">By Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm font-medium text-emerald-900">
              <p><span className="font-bold">{statusCounts.pending}</span> Pending</p>
              <p><span className="font-bold">{statusCounts.approved}</span> Approved</p>
              <p><span className="font-bold">{statusCounts.rejected}</span> Rejected</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-purple-50 to-fuchsia-50 relative overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-purple-900/60 uppercase tracking-widest leading-tight">By Rating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm font-medium text-purple-900">
              {[5, 4, 3, 2, 1].map(rating => (
                <p key={rating} className="flex items-center gap-1">
                  <span className="font-bold w-4">{ratingCounts[rating]}</span> <span className="text-purple-900/60 font-normal">×</span> {rating} ⭐
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-slate-200 rounded-xl bg-white/70 focus-visible:ring-indigo-500 shadow-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 rounded-xl shadow-sm border-slate-200 bg-white/70">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="h-11 rounded-xl shadow-sm border-slate-200 bg-white/70">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tourFilter} onValueChange={setTourFilter}>
                <SelectTrigger className="h-11 rounded-xl shadow-sm border-slate-200 bg-white/70">
                  <SelectValue placeholder="Tour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tours</SelectItem>
                  {tours.map(tour => (
                    <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Review Cards */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 text-center text-slate-500 py-8">
              <CardContent className="p-0 border-0">
                Loading reviews...
              </CardContent>
            </Card>
          ) : filteredReviews.length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60 text-center text-slate-500 py-8">
              <CardContent className="p-0 border-0">
                No reviews found
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map(review => (
              <Card key={review.id} className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{review.reviewer_name}</h3>
                        {review.reviewer_country && (
                          <span className="text-sm text-slate-500">{review.reviewer_country}</span>
                        )}
                        {renderStars(review.rating)}
                      </div>
                      {review.title && (
                        <p className="font-medium text-slate-900 mb-2">{review.title}</p>
                      )}
                      <p className="text-slate-700 mb-3">{review.content}</p>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                        <span>Tour: <strong>{getTourName(review.tour_id)}</strong></span>
                        {review.destination_id && (
                          <span>• Destination: <strong>{getDestinationName(review.destination_id)}</strong></span>
                        )}
                        {review.review_date && (
                          <span>• {format(new Date(review.review_date), 'MMM d, yyyy')}</span>
                        )}
                        {review.source && (
                          <Badge variant="outline" className="ml-2">{review.source}</Badge>
                        )}
                      </div>
                      {review.admin_response && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border-l-4 border-whi">
                          <p className="text-sm font-medium text-slate-700 mb-1">Your Response:</p>
                          <p className="text-sm text-slate-600">{review.admin_response}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusBadge(review.status)}
                    </div>
                  </div>

                  <div className="flex gap-2 border-t pt-4">
                    {review.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(review)}
                          className="text-green-600"
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(review)}
                          className="text-red-600"
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingReview({ ...review })}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRespondingTo(review);
                        setResponseText(review.admin_response || '');
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Respond
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(review)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Review Modal */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reviewer Name *</Label>
                  <Input
                    value={newReview.reviewer_name}
                    onChange={(e) => setNewReview({ ...newReview, reviewer_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newReview.reviewer_country}
                    onChange={(e) => setNewReview({ ...newReview, reviewer_country: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Review Content *</Label>
                <Textarea
                  value={newReview.content}
                  onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rating *</Label>
                  <Select
                    value={newReview.rating.toString()}
                    onValueChange={(val) => setNewReview({ ...newReview, rating: parseInt(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="1">1 Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tour</Label>
                  <Select
                    value={newReview.tour_id}
                    onValueChange={(val) => {
                      setNewReview({ ...newReview, tour_id: val });
                      // Auto-suggest destination from selected tour
                      const selectedTour = tours.find(t => t.id === val);
                      if (selectedTour?.destination_id && !newReview.destination_id) {
                        setNewReview(prev => ({ ...prev, tour_id: val, destination_id: selectedTour.destination_id }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tour" />
                    </SelectTrigger>
                    <SelectContent>
                      {tours.map(tour => (
                        <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Destination</Label>
                <Select
                  value={newReview.destination_id}
                  onValueChange={(val) => setNewReview({ ...newReview, destination_id: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {destinations.map(dest => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}{dest.country ? `, ${dest.country}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Source</Label>
                  <Select
                    value={newReview.source}
                    onValueChange={(val) => setNewReview({ ...newReview, source: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Review Date</Label>
                  <Input
                    type="date"
                    value={newReview.review_date}
                    onChange={(e) => setNewReview({ ...newReview, review_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddReview} className="text-white bg-whi hover:bg-whi-hover">
                Add Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Review Modal */}
        <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
            </DialogHeader>
            {editingReview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reviewer Name</Label>
                    <Input
                      value={editingReview.reviewer_name}
                      onChange={(e) => setEditingReview({ ...editingReview, reviewer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={editingReview.reviewer_country || ''}
                      onChange={(e) => setEditingReview({ ...editingReview, reviewer_country: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editingReview.title || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={editingReview.content}
                    onChange={(e) => setEditingReview({ ...editingReview, content: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Rating</Label>
                    <Select
                      value={editingReview.rating?.toString()}
                      onValueChange={(val) => setEditingReview({ ...editingReview, rating: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editingReview.status}
                      onValueChange={(val) => setEditingReview({ ...editingReview, status: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Source</Label>
                    <Input
                      value={editingReview.source || ''}
                      onChange={(e) => setEditingReview({ ...editingReview, source: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tour</Label>
                    <Select
                      value={editingReview.tour_id || ''}
                      onValueChange={(val) => {
                        setEditingReview({ ...editingReview, tour_id: val === '__none__' ? '' : val });
                        // Auto-suggest destination from selected tour
                        const selectedTour = tours.find(t => t.id === val);
                        if (selectedTour?.destination_id && !editingReview.destination_id) {
                          setEditingReview(prev => ({ ...prev, tour_id: val, destination_id: selectedTour.destination_id }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tour" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {tours.map(tour => (
                          <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <Select
                      value={editingReview.destination_id || ''}
                      onValueChange={(val) => setEditingReview({ ...editingReview, destination_id: val === '__none__' ? '' : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {destinations.map(dest => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}{dest.country ? `, ${dest.country}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingReview(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} className="text-white bg-whi hover:bg-whi-hover">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Respond Modal */}
        <Dialog open={!!respondingTo} onOpenChange={() => setRespondingTo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respond to Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Your Response</Label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                  placeholder="Write your response to this review..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRespondingTo(null)}>Cancel</Button>
              <Button onClick={handleRespond} className="text-white bg-whi hover:bg-whi-hover">
                Post Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}