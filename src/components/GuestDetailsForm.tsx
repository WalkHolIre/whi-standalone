// @ts-nocheck
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

export default function GuestDetailsForm({ guests, onChange, numberOfGuests }) {
  const addGuest = () => {
    const newGuest = {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      room_type: '',
      dietary_requirements: ''
    };
    onChange([...guests, newGuest]);
  };

  const updateGuest = (index, field, value) => {
    const updated = [...guests];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeGuest = (index) => {
    const updated = guests.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Auto-add guests to match numberOfGuests
  React.useEffect(() => {
    if (numberOfGuests > guests.length) {
      const newGuests = [...guests];
      for (let i = guests.length; i < numberOfGuests; i++) {
        newGuests.push({
          first_name: '',
          last_name: '',
          date_of_birth: '',
          gender: '',
          room_type: '',
          dietary_requirements: ''
        });
      }
      onChange(newGuests);
    }
  }, [numberOfGuests, guests.length]);

  const roomTypes = [
    { value: 'Single', label: 'Single (1 single bed)' },
    { value: 'Twin', label: 'Twin (2 single beds, shared)' },
    { value: 'Double', label: 'Double (1 double bed, shared)' },
    { value: 'Triple', label: 'Triple (3 single beds, shared)' },
    { value: 'Family', label: 'Family (1 double + 1 single)' }
  ];

  const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Guest Details</h3>
        <p className="text-sm text-slate-600">
          {guests.length} of {numberOfGuests} guests
        </p>
      </div>

      {guests.map((guest, index) => (
        <Card key={index} className="bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Guest {index + 1} {index === 0 && <span className="text-xs text-slate-500 ml-2">(Lead Guest)</span>}
              </CardTitle>
              {index > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGuest(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={guest.first_name}
                  onChange={(e) => updateGuest(index, 'first_name', e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={guest.last_name}
                  onChange={(e) => updateGuest(index, 'last_name', e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={guest.date_of_birth}
                  onChange={(e) => updateGuest(index, 'date_of_birth', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={guest.gender}
                  onValueChange={(val) => updateGuest(index, 'gender', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Room Type *</Label>
              <Select
                value={guest.room_type}
                onValueChange={(val) => updateGuest(index, 'room_type', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dietary Requirements</Label>
              <Textarea
                value={guest.dietary_requirements}
                onChange={(e) => updateGuest(index, 'dietary_requirements', e.target.value)}
                placeholder="e.g., Vegetarian, Gluten-free, Nut allergy..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {guests.length < numberOfGuests && (
        <Button
          variant="outline"
          onClick={addGuest}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Guest {guests.length + 1}
        </Button>
      )}
    </div>
  );
}