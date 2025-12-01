import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from "sonner"
import { Separator } from './ui/separator';

export default function SendRequest(props:any) {
  const [request, setRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = () => {
    setIsProcessing(true);
    setTimeout(() => {
            toast("Success !!", {
                description: "Request processed"
              })
        
      setIsProcessing(false);
    }, 2000);
  };

 
  return (
      <Dialog>
        <DialogTrigger asChild>
          <Button>Send Request</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-thin">Send Request to Agent</DialogTitle>
            <Separator/>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Request Textarea */}
            <div className="space-y-2">
              <Label htmlFor="request" className="font-thin">
                Your Request:
              </Label>
              <Textarea
                id="request"
                placeholder="e.g., Find the best laptop under $1000"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isProcessing}
              />
            </div>

            {/* Processing Alert */}
            {isProcessing && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-800" />
                <AlertDescription className="text-yellow-800 text-sm ml-2">
                  Agent is processing your request...
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              
              <Button
                onClick={handleSend}
                disabled={isProcessing || !request.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
}