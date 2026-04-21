"""
Timetable Scheduler — Min-Conflicts (Iterative Repair) Algorithm

Constraints enforced:
1. Monday–Friday, 8 AM – 6 PM
2. No classes Wednesday 10 AM – 12 PM
3. Global Lunch Break: 12 PM - 1 PM for all departments
4. Max 4-hour continuous classes for any student group
5. 1-unit → 1 hr, 2-unit → 2 hr, 3+ → multiple sessions (max 2 hr each)
6. Hall capacity must fit TOTAL student count of the session
7. Hall must match course department(s)
8. No double-booking of halls or lecturers
9. Lecturers cannot teach on their unavailable days/times
10. Cross-listed courses (shared_session_id) share the same slot and hall
"""

import random
import uuid
import time
from collections import defaultdict
from django.db import models as db_models
from django.db import transaction
from .models import (
    Course, LectureHall, Lecturer, TimeSlot, TimetableEntry,
    LecturerUnavailability, Department
)

CAPACITY_UPPER_MULTIPLIER = 3


def generate_time_slots():
    """Create all valid time slots in the database."""
    TimeSlot.objects.all().delete()
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    created = []

    for day in days:
        for start in range(8, 18):
            for duration in [1, 2]:
                end = start + duration
                if end > 18: continue
                # Wednesday: skip anything overlapping 10-12
                if day == 'Wednesday' and start < 12 and end > 10: continue
                # Global Lunch Break: skip anything overlapping 12 PM - 1 PM
                if start < 13 and end > 12: continue

                slot, is_new = TimeSlot.objects.get_or_create(
                    day=day, start_hour=start, end_hour=end
                )
                if is_new:
                    created.append(slot)
    return created


def get_suitable_halls(total_student_count, department_ids, course_type='departmental'):
    course_colleges = set(
        Department.objects.filter(id__in=department_ids)
        .values_list('college_id', flat=True)
    ) if department_ids else set()

    suitable = []
    for hall in LectureHall.objects.prefetch_related('colleges').all():
        if hall.capacity < total_student_count:
            continue

        if course_type != 'general':
            max_allowed = max(total_student_count * CAPACITY_UPPER_MULTIPLIER, 600)
            if hall.capacity > max_allowed:
                continue

        if hall.hall_type == 'general':
            suitable.append(hall)
        elif hall.hall_type in ('shared', 'college'):
            if not course_colleges:
                suitable.append(hall)
            else:
                hall_college_ids = set(hall.colleges.values_list('id', flat=True))
                if course_colleges & hall_college_ids:
                    suitable.append(hall)

    suitable.sort(key=lambda h: h.capacity)
    return suitable


def generate_timetable():
    # Record starting state
    TimetableEntry.objects.all().delete()
    generate_time_slots()

    # Pre-fetch unavailabilities
    lecturer_unavailabilities = defaultdict(list)
    for u in LecturerUnavailability.objects.all():
        lecturer_unavailabilities[u.lecturer_id].append(u)

    all_courses = Course.objects.filter(
        lecturer__isnull=False
    ).select_related('lecturer', 'department').prefetch_related('shared_departments')

    if not all_courses.exists():
        return False, "No courses with assigned lecturers found.", []

    # Cache depts per course
    course_depts_cache = {}
    for c in all_courses:
        course_depts_cache[c.id] = set(c.get_all_departments().values_list('id', flat=True))

    def is_hard_conflict(session_data, time_slot, placed_sessions, ignore_uuids):
        """Check strict model rules that CANNOT be solved by evicting"""
        # 1. Lecturer Unavailability
        unavail = lecturer_unavailabilities.get(session_data['lecturer'].id, [])
        for u in unavail:
            if u.day == time_slot.day and time_slot.start_hour < u.end_hour and time_slot.end_hour > u.start_hour:
                return True

        # 2. Avoid scheduling multiple sessions of the SAME course group on the SAME day
        if session_data['sess_idx'] > 0:
            for p_uuid, p_sess in placed_sessions.items():
                if p_uuid in ignore_uuids: continue
                if p_sess['session']['group_id'] == session_data['group_id'] and p_sess['slot'].day == time_slot.day:
                    return True

        # 3. 4-Hour max continuous constraint
        # We check for EVERY course in the cross-listing group
        for c_obj in session_data['courses']:
            local_depts = course_depts_cache[c_obj.id]
            level = c_obj.level
            
            hours_used = set(range(time_slot.start_hour, time_slot.end_hour))
            
            for p_uuid, p_sess in placed_sessions.items():
                if p_uuid in ignore_uuids or p_sess['slot'].day != time_slot.day:
                    continue
                
                # Check if this placed session overlaps with our student group
                shares_student_group = False
                for p_c in p_sess['session']['courses']:
                    if p_c.level == level:
                        p_depts = course_depts_cache[p_c.id]
                        if local_depts & p_depts:
                            shares_student_group = True
                            break
                
                if shares_student_group:
                    for hr in range(p_sess['slot'].start_hour, p_sess['slot'].end_hour):
                        hours_used.add(hr)
            
            if hours_used:
                max_consec = 0
                curr_consec = 0
                # Scan through the day's hours
                # Note: 12-1pm gap is already enforced in TimeSlot generation,
                # so hours_used will never contain 12. This naturally breaks continuity.
                for hr in range(8, 19):
                    if hr in hours_used:
                        curr_consec += 1
                        if curr_consec > 4: return True
                        max_consec = max(max_consec, curr_consec)
                    else:
                        curr_consec = 0
        return False

    def get_conflicts(session_data, time_slot, hall, placed_sessions):
        """Returns set of UUIDs to evict, or None if hard conflict exists."""
        conflicting_uuids = set()

        for p_uuid, p_sess in placed_sessions.items():
            if p_sess['slot'].day != time_slot.day: continue
            
            # Check time overlap
            has_time_overlap = (time_slot.start_hour < p_sess['slot'].end_hour and 
                               time_slot.end_hour > p_sess['slot'].start_hour)
            if not has_time_overlap: continue
            
            is_collision = False
            # Hall collision
            if p_sess['hall'].id == hall.id:
                is_collision = True
            # Lecturer collision
            elif p_sess['session']['lecturer'].id == session_data['lecturer'].id:
                is_collision = True
            else:
                # Student group collision (Department + Level)
                for local_c in session_data['courses']:
                    local_depts = course_depts_cache[local_c.id]
                    for p_c in p_sess['session']['courses']:
                        if p_c.level == local_c.level:
                            p_depts = course_depts_cache[p_c.id]
                            if local_depts & p_depts:
                                is_collision = True
                                break
                    if is_collision: break

            if is_collision:
                conflicting_uuids.add(p_uuid)

        # After identifying necessary evictions, check if hard constraints still fail
        if is_hard_conflict(session_data, time_slot, placed_sessions, conflicting_uuids):
            return None
            
        return conflicting_uuids

    # Group courses into sessions
    groups = {}
    for course in all_courses:
        raw_sid = course.shared_session_id
        clean_sid = raw_sid.strip() if raw_sid else None
        gid = clean_sid if clean_sid else f"SINGLE_{course.id}"
        if gid not in groups:
            groups[gid] = []
        groups[gid].append(course)

    session_queue = []
    for gid, courses in groups.items():
        total_students = sum(c.student_count for c in courses)
        lecturer = courses[0].lecturer
        durations = courses[0].get_session_durations()
        
        all_dept_ids = set()
        for c in courses:
            all_dept_ids.update(course_depts_cache[c.id])
            
        group_type = 'general' if any(c.course_type == 'general' for c in courses) else courses[0].course_type
        suitable_halls = get_suitable_halls(total_students, all_dept_ids, group_type)

        for i, duration in enumerate(durations):
            session_queue.append({
                'uuid': str(uuid.uuid4()),
                'group_id': gid,
                'courses': courses,
                'lecturer': lecturer,
                'duration': duration,
                'sess_idx': i,
                'suitable_halls': suitable_halls,
                'total_students': total_students
            })

    all_slots = list(TimeSlot.objects.all())
    slots_by_dur = {1: [s for s in all_slots if s.duration==1], 
                    2: [s for s in all_slots if s.duration==2]}

    placed_sessions = {}
    unscheduled_queue = list(session_queue)
    permanently_unscheduled = []
    
    # Randomize start order to avoid bias
    random.shuffle(unscheduled_queue)
    
    # Iterative Repair Loop
    max_iters = len(session_queue) * 20
    iters = 0
    
    while unscheduled_queue and iters < max_iters:
        iters += 1
        session = unscheduled_queue.pop(0)
        dur = session['duration']
        halls = session['suitable_halls']
        
        if not halls:
            permanently_unscheduled.append({
                'course': session['courses'][0],
                'reason': f"No suitable hall for capacity {session['total_students']}"
            })
            continue

        candidates = []
        possible_slots = slots_by_dur.get(dur, [])
        
        # Try all slot/hall combinations
        for slot in possible_slots:
            for hall in halls:
                evict_set = get_conflicts(session, slot, hall, placed_sessions)
                if evict_set is not None:
                    # Score is the number of sessions we have to kick out
                    candidates.append((len(evict_set), evict_set, slot, hall))
        
        if candidates:
            # Min-conflicts: Pick the one that evicts the fewest other sessions
            # If multiple ties, we pick a random one for noise
            candidates.sort(key=lambda x: x[0])
            min_evicts = candidates[0][0]
            best_options = [c for c in candidates if c[0] == min_evicts]
            
            # 5% probability to pick a slightly worse option to escape local optima
            if random.random() < 0.05 and len(candidates) > len(best_options):
                 chosen = random.choice(candidates[:min(5, len(candidates))])
            else:
                 chosen = random.choice(best_options)
                 
            num_evicts, evicts, best_slot, best_hall = chosen
            
            # Execute evictions
            for u in evicts:
                evicted_data = placed_sessions.pop(u)
                unscheduled_queue.append(evicted_data['session'])
            
            # Place
            placed_sessions[session['uuid']] = {
                'session': session,
                'slot': best_slot,
                'hall': best_hall
            }
        else:
            # Overconstrained: No possible slot combo without hitting HARD constraints
            reason = "Hard Conflict (Lecturer/4hr overlap). Try reducing lecturer unavailability."
            if not session['suitable_halls']:
                reason = f"No halls suitable for {session['total_students']} students."
            
            permanently_unscheduled.append({
                'course': session['courses'][0].code,
                'dept_code': session['courses'][0].department.code if session['courses'][0].department else 'N/A',
                'level': session['courses'][0].level,
                'reason': reason
            })
            # Truly impossible to place this session without breaking a Hard Constraint
            # We don't discard it yet, we just put it back at the end of the queue and keep trying
            unscheduled_queue.append(session)
            # If we've tried many times and it's still at the end, maybe it is permanently unschedulable
            if iters > max_iters * 0.9:
                # Track failures to report
                pass

    # Final Database Write
    all_entries = []
    for p in placed_sessions.values():
        s = p['session']
        for c in s['courses']:
            all_entries.append(TimetableEntry(
                course=c, lecturer=s['lecturer'],
                hall=p['hall'], time_slot=p['slot'],
                session_number=s['sess_idx'] + 1
            ))
            
    with transaction.atomic():
        TimetableEntry.objects.bulk_create(all_entries)

    # Resolve return values
    scheduled_uuids = set(placed_sessions.keys())
    for s in session_queue:
        if s['uuid'] not in scheduled_uuids:
            # Check if reason was already found
            if not any(u['course'] == s['courses'][0] for u in permanently_unscheduled):
                 permanently_unscheduled.append({
                 'course': s['courses'][0].code,
                 'dept_code': s['courses'][0].department.code if s['courses'][0].department else 'N/A',
                 'level': s['courses'][0].level,
                 'reason': "Could not find a valid slot without violating hard constraints (Wait, No Break or Over 4hrs)."
             })

    total_sessions = len(session_queue)
    success_count = len(placed_sessions)
    msg = f"Scheduled {success_count}/{total_sessions} sessions."
    
    return len(permanently_unscheduled) == 0, msg, permanently_unscheduled
