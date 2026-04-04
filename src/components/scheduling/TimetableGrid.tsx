'use client';

import React from 'react';
import { Clock, MapPin, User, BookOpen } from 'lucide-react';

interface TimetableEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  faculty_name: string;
  room_number: string;
  group_name?: string;
  is_published: boolean;
}

interface TimetableGridProps {
  entries: TimetableEntry[];
  days: string[];
  timeSlots: string[];
  onAddEntry?: (day: string, slot: string) => void;
}

export function TimetableGrid({ entries, days, timeSlots, onAddEntry }: TimetableGridProps) {
  const getEntryForSlot = (day: string, time: string) => {
    return entries.find(e => e.day_of_week === day && e.start_time === time);
  };

  return (
    <div className="w-full bg-background border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-4 text-left font-semibold text-xs border-r w-32 uppercase tracking-wider text-muted-foreground">Time</th>
              {days.map(day => (
                <th key={day} className="p-4 text-center font-semibold text-xs min-w-[200px] uppercase tracking-wider text-muted-foreground">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(time => (
              <tr key={time} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4 border-r bg-muted/20">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Clock size={14} className="text-muted-foreground" />
                    {time}
                  </div>
                </td>
                {days.map(day => {
                  const entry = getEntryForSlot(day, time);
                  return (
                    <td key={`${day}-${time}`} className="p-2 border-r last:border-r-0 h-40 align-top">
                      {entry ? (
                        <div className={`h-full p-4 rounded-md border flex flex-col justify-between transition-all ${
                          entry.is_published 
                          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                          : 'bg-muted border-muted-foreground/10 hover:bg-accent'
                        }`}>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-60">
                                {entry.is_published ? 'Published' : 'Draft'}
                              </span>
                              <BookOpen size={14} className="text-primary/40" />
                            </div>
                            <h4 className="text-sm font-bold text-foreground leading-tight">
                              {entry.subject_name}
                            </h4>
                            {entry.group_name && (
                              <p className="text-[10px] text-muted-foreground font-medium uppercase">{entry.group_name}</p>
                            )}
                          </div>

                          <div className="space-y-1.5 pt-2 mt-auto">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                              <User size={12} className="text-primary/60" />
                              <span className="truncate">{entry.faculty_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                              <MapPin size={12} className="text-primary/60" />
                              <span>Room {entry.room_number}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => onAddEntry?.(day, time)}
                          className="w-full h-full rounded-md border border-dashed border-muted-foreground/20 flex flex-col items-center justify-center text-muted-foreground/30 hover:text-primary/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                        >
                          <span className="text-xs font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Add Session
                          </span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
