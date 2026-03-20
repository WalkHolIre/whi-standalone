'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RouteAssignment({
  selectedRoute = null,
  routes = [],
  onSelect,
  onClear,
}: {
  selectedRoute?: string | null;
  routes?: Array<{ id: string; name: string }>;
  onSelect?: (routeId: string) => void;
  onClear?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Route Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedRoute || ''} onValueChange={onSelect}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a route" />
            </SelectTrigger>
            <SelectContent>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRoute && (
            <Button variant="outline" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
        {selectedRoute && (
          <div className="text-sm text-slate-600">
            Selected: {routes.find((r) => r.id === selectedRoute)?.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
