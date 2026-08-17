import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, Clock, Eye, MapPin, Search } from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EventDetailDialog } from '@/components/drives/EventDetailDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyEvents } from '@/hooks/use-event-api';
import { markSurfaceSeen } from '@/hooks/use-student-new-indicators';
import { EVENT_STATUS_CONFIG } from '@/lib/eventModule';
import { getEventTypeLabel } from '@/types/event';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export default function StudentDrives() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);

  useEffect(() => {
    markSurfaceSeen('drives');
  }, []);

  const eventsQuery = useMyEvents();

  const events = eventsQuery.data?.data ?? [];
  const filteredEvents = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) =>
      [event.title, event.company?.name, event.venue, getEventTypeLabel(event.type)]
        .some((field) => (field ?? '').toLowerCase().includes(query))
    );
  }, [deferredSearch, events]);
  const upcomingEvents = useMemo(
    () => filteredEvents.filter((event) => event.status === 'published' || event.status === 'ongoing'),
    [filteredEvents]
  );
  const pastEvents = useMemo(
    () => filteredEvents.filter((event) => event.status === 'completed' || event.status === 'cancelled'),
    [filteredEvents]
  );

  return (
    <DashboardLayout
      title="My Events & Drives"
      subtitle="View your live campus event schedule and assigned drives"
    >
      <div className="space-y-6">
        {eventsQuery.error && (
          <Alert variant="destructive">
            <Calendar className="h-4 w-4" />
            <AlertTitle>Unable to load your events</AlertTitle>
            <AlertDescription>
              {getErrorMessage(eventsQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, company, venue, or type..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingEvents.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastEvents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={Calendar}
                    title="No upcoming events"
                    description="Assigned upcoming drives and events will appear here."
                  />
                </CardContent>
              </Card>
            ) : (
              upcomingEvents.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
                      <Badge variant="outline" className={EVENT_STATUS_CONFIG[event.status].color}>
                        {EVENT_STATUS_CONFIG[event.status].label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {event.company.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(event.date), 'dd MMM yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {event.start_time} - {event.end_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.venue}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setSelectedEventId(event.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastEvents.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={Clock}
                    title="No past events"
                    description="Completed and cancelled events will appear here."
                  />
                </CardContent>
              </Card>
            ) : (
              pastEvents.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
                      <Badge variant="outline" className={EVENT_STATUS_CONFIG[event.status].color}>
                        {EVENT_STATUS_CONFIG[event.status].label}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <CardDescription>
                      {event.company.name} • {format(new Date(event.date), 'dd MMM yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setSelectedEventId(event.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedEventId && (
        <EventDetailDialog
          eventId={selectedEventId}
          open={Boolean(selectedEventId)}
          onOpenChange={(open) => !open && setSelectedEventId(null)}
          mode="my"
        />
      )}
    </DashboardLayout>
  );
}
