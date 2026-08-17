import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePanel } from '@/hooks/use-event-api';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

interface EventPanelDialogProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function EventPanelDialog({ eventId, open, onOpenChange }: EventPanelDialogProps) {
  const createPanel = useCreatePanel();
  const [panelName, setPanelName] = useState('');
  const [room, setRoom] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recruiters, setRecruiters] = useState('');

  async function handleSubmit() {
    if (!eventId) return;

    try {
      await createPanel.mutateAsync({
        eventId,
        data: {
          panel_name: panelName.trim(),
          room: room.trim(),
          start_time: startTime || null,
          end_time: endTime || null,
          recruiters: recruiters
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      toast.success('Panel created successfully.');
      setPanelName('');
      setRoom('');
      setStartTime('');
      setEndTime('');
      setRecruiters('');
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to create the panel.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Panel</DialogTitle>
          <DialogDescription>
            Add a new interview or assessment panel to the selected live event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Panel Name *</Label>
            <Input value={panelName} onChange={(event) => setPanelName(event.target.value)} placeholder="Panel A - Technical" />
          </div>
          <div className="space-y-2">
            <Label>Room *</Label>
            <Input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Room 301" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Recruiters</Label>
            <Input
              value={recruiters}
              onChange={(event) => setRecruiters(event.target.value)}
              placeholder="Jane Doe, John Smith"
            />
            <p className="text-xs text-muted-foreground">Comma-separated recruiter names.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createPanel.isPending || !panelName.trim() || !room.trim()}
          >
            {createPanel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Panel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
