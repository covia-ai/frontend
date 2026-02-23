import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from "sonner"
import { useVenues } from '@/hooks/use-venues';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

export default function CloneToVenue(props:any) {
  const [cloneName, setCloneName] = useState('');
  const [targetVenue, setTargetVenue] = useState('');
  const venues = useVenues().venues;

  const handleClone = () => {
     toast("Success !!", {
         description: "Agent clones on "+targetVenue
    })
  };
  return (
    <Dialog >
      <DialogTrigger asChild>
          <Button  aria-label='clone to venue' role="button">Clone To Venue</Button>
        </DialogTrigger>
      <DialogContent className="h-140 bg-card text-card-foreground">
        <DialogHeader className="pt-6 pb-4">
          <DialogTitle className="text-2xl font-thin">Clone Agent</DialogTitle>
        </DialogHeader>
        
        <div className=" space-y-6">
          {/* Current Location */}
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-sm text-gray-700 flex flex-row">
              Currently in: <span className="">{props.venueName}</span> 
            </AlertDescription>
          </Alert>

          {/* Target Venue */}
          <div className="space-y-2">
            <label className="text-sm">
              Target Venue:
            </label>
            <Select value={targetVenue} onValueChange={setTargetVenue}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select venue..." />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) =>  (
                  <SelectItem key={venue.venueId} value={venue.venueId}>{venue.metadata.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clone Name */}
          <div className="space-y-2">
            <label className="text-sm">
              Clone Name (optional):
            </label>
            <Input
              type="text"
              placeholder="Customer Support Agent (EU)"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Leave empty to use same name as original
            </p>
          </div>

          {/* Note */}
          <div className="flex items-start gap-3">
              <Checkbox defaultChecked id="history" />
              <Label htmlFor="history">Complete history will be preserved at the new venue</Label>
            </div>
        </div>

         {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
           
              <DialogClose>
              <Button
                 disabled={!targetVenue.trim()}
                className="flex-1"
                onClick={() => handleClone()}
                aria-label='clone to venue' role="button"
              >
                Clone
              </Button>
              </DialogClose>
            </div>
      </DialogContent>
    </Dialog>
  );
}