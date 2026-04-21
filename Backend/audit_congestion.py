import os
import django

# Set up Django environment before importing models
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "school_timetable.settings")
django.setup()

from timetable.models import Course
from collections import defaultdict

def audit():
    stats = defaultdict(int)
    all_c = Course.objects.filter(lecturer__isnull=False)
    for c in all_c:
        code = c.department.code if c.department else 'N/A'
        stats[(code, c.level)] += sum(c.get_session_durations())
    
    sorted_stats = sorted(stats.items(), key=lambda x: x[1], reverse=True)
    print("--- CONGESTION AUDIT ---")
    for (dept, level), total_hrs in sorted_stats:
        print(f"Dept: {dept} | Level: {level} | Requested Hours: {total_hrs}")

def audit_lecturers():
    stats = defaultdict(int)
    all_c = Course.objects.filter(lecturer__isnull=False)
    for c in all_c:
        stats[f"{c.lecturer.first_name} {c.lecturer.last_name}"] += sum(c.get_session_durations())
    
    sorted_stats = sorted(stats.items(), key=lambda x: x[1], reverse=True)
    print("\n--- LECTURER LOAD AUDIT ---")
    for name, hrs in sorted_stats:
        print(f"Lecturer: {name} | Hours: {hrs}")

if __name__ == "__main__":
    audit()
    audit_lecturers()
