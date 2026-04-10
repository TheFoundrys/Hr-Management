import { query } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';

export interface TimeSlot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
}

export interface Subject {
  id: string;
  name: string;
  course_id: string;
  group_id?: string;
  hours_per_week: number;
  faculty_id?: string;
}

export interface Classroom {
  id: string;
  room_number: string;
  capacity: number;
}

export interface TimetableEntry {
  course_id: string;
  subject_id: string;
  faculty_id: string;
  classroom_id: string;
  time_slot_id: string;
  tenant_id: string;
}

export class SchedulingEngine {
  private tenant_id: string;

  constructor(tenant_id: string = 'default') {
    this.tenant_id = tenant_id;
  }

  /**
   * Generates a conflict-free timetable for a specific group or all courses in a tenant.
   */
  async generateSchedule(groupId?: string) {
    console.log(`🚀 Starting schedule generation for tenant: ${this.tenant_id}, Group: ${groupId || 'ALL'}`);

    // 1. Fetch Resources
    const { rows: classrooms } = await query('SELECT * FROM classrooms WHERE tenant_id = $1 ORDER BY capacity DESC', [this.tenant_id]);
    const { rows: timeSlots } = await query('SELECT * FROM time_slots WHERE tenant_id = $1 ORDER BY day, start_time', [this.tenant_id]);
    
    // 2. Fetch Subjects to schedule
    let subjectsQuery = `
      SELECT s.*, fs.faculty_id, c.name as course_name
      FROM subjects s 
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN faculty_subjects fs ON s.id = fs.subject_id 
      WHERE s.tenant_id = $1
    `;
    const subjectsParams: any[] = [this.tenant_id];
    if (groupId) {
      subjectsQuery += ` AND s.group_id = $2`;
      subjectsParams.push(groupId);
    }
    const { rows: subjectsToSchedule } = await query(subjectsQuery, subjectsParams);

    // 3. Fetch EXISTING timetable entries for conflict checking
    // CRITICAL FIX: Exclude the entries for the group we are currently regenerating,
    // otherwise the group's own old draft will block the new generation.
    let existingQuery = `
      SELECT t.* 
      FROM timetable t 
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE t.tenant_id = $1
    `;
    const existingParams: any[] = [this.tenant_id];
    
    if (groupId) {
      existingQuery += ` AND (s.group_id IS NULL OR s.group_id != $2)`;
      existingParams.push(groupId);
    }

    const { rows: existingEntries } = await query(existingQuery, existingParams);

    const timetable: TimetableEntry[] = [];
    const unscheduled: any[] = [];

    // Trackers for conflicts
    const teacherBusy = new Map<string, Set<string>>(); // faculty_id -> Set<time_slot_id>
    const roomBusy = new Map<string, Set<string>>();    // classroom_id -> Set<time_slot_id>
    const courseBusy = new Map<string, Set<string>>();  // course_id -> Set<time_slot_id>

    // Populate trackers with existing entries
    const getBusySet = (map: Map<string, Set<string>>, id: string) => {
      if (!map.has(id)) map.set(id, new Set());
      return map.get(id)!;
    };

    for (const entry of existingEntries) {
      if (entry.faculty_id) getBusySet(teacherBusy, entry.faculty_id).add(entry.time_slot_id);
      if (entry.classroom_id) getBusySet(roomBusy, entry.classroom_id).add(entry.time_slot_id);
      if (entry.course_id) getBusySet(courseBusy, entry.course_id).add(entry.time_slot_id);
    }

    // 4. Main Scheduling Loop
    for (const subject of subjectsToSchedule) {
      if (!subject.faculty_id) {
        unscheduled.push({ subject: subject.name, reason: 'No faculty assigned to this subject' });
        continue;
      }

      let hoursNeeded = subject.hours_per_week || 3;
      let assignedInSubject = 0;

      // Try assigning slots
      for (const slot of timeSlots) {
        if (assignedInSubject >= hoursNeeded) break;

        const tSet = getBusySet(teacherBusy, subject.faculty_id);
        const cSet = getBusySet(courseBusy, subject.course_id);

        // Conflict Check: Teacher and Course
        if (tSet.has(slot.id) || cSet.has(slot.id)) {
          continue;
        }

        // Conflict Check: Find an available classroom
        let assignedRoomId = null;
        for (const room of classrooms) {
          const roomSet = getBusySet(roomBusy, room.id);
          if (!roomSet.has(slot.id)) {
            assignedRoomId = room.id;
            break;
          }
        }

        if (assignedRoomId) {
          // Assign!
          timetable.push({
            course_id: subject.course_id,
            subject_id: subject.id,
            faculty_id: subject.faculty_id,
            classroom_id: assignedRoomId,
            time_slot_id: slot.id,
            tenant_id: this.tenant_id
          });

          // Mark Busy
          tSet.add(slot.id);
          getBusySet(roomBusy, assignedRoomId).add(slot.id);
          cSet.add(slot.id);
          
          assignedInSubject++;
        }
      }

      if (assignedInSubject < hoursNeeded) {
        unscheduled.push({ 
          subject: subject.name, 
          course: subject.course_name, 
          reason: `Insufficient slots (Assigned ${assignedInSubject}/${hoursNeeded}). Conflicts detected.` 
        });
      }
    }

    return { timetable, unscheduled };
  }

  /**
   * Saves the generated timetable as "draft".
   */
  async saveDraft(entries: TimetableEntry[], userId: string, groupId?: string) {
    if (groupId) {
       await query(`
         DELETE FROM timetable 
         WHERE tenant_id = $1 
         AND subject_id IN (SELECT id FROM subjects WHERE group_id = $2)
       `, [this.tenant_id, groupId]);
    } else {
       await query('DELETE FROM timetable WHERE tenant_id = $1 AND status = $2', [this.tenant_id, 'draft']);
    }

    // Prepare insert promises
    for (const entry of entries) {
      await query(`
        INSERT INTO timetable 
        (course_id, subject_id, faculty_id, classroom_id, time_slot_id, tenant_id, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        entry.course_id, entry.subject_id, entry.faculty_id, 
        entry.classroom_id, entry.time_slot_id, entry.tenant_id, 
        'draft', userId
      ]);
    }
  }

  async publish(groupId?: string) {
    if (groupId) {
       await query(`
         UPDATE timetable SET status = $1 
         WHERE tenant_id = $2
         AND subject_id IN (SELECT id FROM subjects WHERE group_id = $3)
       `, ['published', this.tenant_id, groupId]);
    } else {
       await query('UPDATE timetable SET status = $1 WHERE tenant_id = $2', ['published', this.tenant_id]);
    }
  }
}
